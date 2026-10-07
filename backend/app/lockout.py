"""Face-login lockout storage and rate limiting.

Specifications:
- Key failures by an HMAC-SHA256 digest of random device-ID cookie (server secret from env).
- 5 failures = 60s lock on device.
- Looser per-IP backstop (default 30 failures / 10 min, configurable via env).
- Real client IP extracted only from trusted proxies (prevents header spoofing).
- Secure flag on device cookie configurable via env (default true).
- Storage in Supabase table ``login_attempts`` via atomic RPC ``record_login_attempt``.
- Non-atomic fallback removed: if the RPC is missing or store is unreachable,
  the system fails closed with a clear error log to prevent brute-force attacks.
- A shared classroom IP is never locked out by a single device's failures.
"""

from datetime import datetime, timezone, timedelta
import hashlib
import hmac
import logging
import os
import secrets
from typing import Optional, Tuple

from fastapi import Request, Response

logger = logging.getLogger("snapclass.lockout")

# ---------------------------------------------------------------------------
# Configuration & Constants
# ---------------------------------------------------------------------------

DEVICE_COOKIE_NAME = "snapclass_device_id"
DEVICE_COOKIE_MAX_AGE = 365 * 86400  # 1 year

DEVICE_MAX_FAILURES = 5
DEVICE_LOCK_SECONDS = 60
# Per-device keys persist until success or lock (or long window if set via env)
DEVICE_WINDOW_SECONDS = (
    int(os.environ["LOCKOUT_DEVICE_WINDOW_SECONDS"])
    if os.environ.get("LOCKOUT_DEVICE_WINDOW_SECONDS")
    else None
)

IP_MAX_FAILURES = int(os.environ.get("IP_LOCKOUT_MAX_ATTEMPTS", os.environ.get("LOCKOUT_IP_MAX_ATTEMPTS", "30")))
IP_LOCK_SECONDS = int(os.environ.get("IP_LOCKOUT_WINDOW_SECONDS", os.environ.get("LOCKOUT_IP_WINDOW_SECONDS", "600")))
IP_WINDOW_SECONDS = int(os.environ.get("LOCKOUT_IP_WINDOW_SECONDS", os.environ.get("IP_LOCKOUT_WINDOW_SECONDS", "600")))

DEV_MODE = os.environ.get("DEV_MODE", "").strip().lower() in ("true", "1", "yes")
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false" if DEV_MODE else "true").lower() in ("true", "1", "yes")

LOCKOUT_SECRET = os.environ.get("LOCKOUT_SECRET")
if not LOCKOUT_SECRET:
    if DEV_MODE:
        LOCKOUT_SECRET = os.environ.get("SESSION_SECRET", "dev-insecure-lockout-secret")
    else:
        raise RuntimeError(
            "LOCKOUT_SECRET environment variable is missing. "
            "Refusing to start. Set LOCKOUT_SECRET or set DEV_MODE=true for local development."
        )

# Trusted proxy IPs (comma-separated, e.g. "127.0.0.1,10.0.0.1")
TRUSTED_PROXIES = {
    ip.strip()
    for ip in os.environ.get("TRUSTED_PROXIES", "").split(",")
    if ip.strip()
}


def _get_supabase_client(client=None):
    if client is not None:
        return client
    try:
        from app.config import supabase
        return supabase
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Key Hashing & Identifiers (HMAC-SHA256)
# ---------------------------------------------------------------------------

def hash_key(prefix: str, identifier: str) -> str:
    """Generate an HMAC-SHA256 digest for a key identifier using server secret."""
    key_bytes = LOCKOUT_SECRET.encode("utf-8")
    msg_bytes = f"{prefix}:{identifier}".encode("utf-8")
    return hmac.new(key_bytes, msg_bytes, hashlib.sha256).hexdigest()


def get_or_create_device_id(request: Request) -> Tuple[str, bool]:
    """Retrieve device ID from cookie or generate a new cryptographically secure ID.

    Returns
    -------
    tuple[str, bool]
        ``(device_id, is_new)``
    """
    device_id = request.cookies.get(DEVICE_COOKIE_NAME)
    if device_id and device_id.strip():
        return device_id.strip(), False
    new_id = secrets.token_hex(16)
    return new_id, True


def set_device_cookie(response: Response, device_id: str) -> None:
    """Attach a long-lived device-ID cookie to the response."""
    response.set_cookie(
        key=DEVICE_COOKIE_NAME,
        value=device_id,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=DEVICE_COOKIE_MAX_AGE,
        path="/",
    )


def get_client_ip(request: Request) -> str:
    """Extract client IP, inspecting forwarded headers ONLY if coming from a trusted proxy.

    If the immediate peer is NOT in TRUSTED_PROXIES, forwarded headers are ignored
    to prevent spoofing.
    """
    peer_ip = request.client.host if request.client else "127.0.0.1"

    if peer_ip in TRUSTED_PROXIES:
        # Check X-Forwarded-For (leftmost client IP)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            ips = [ip.strip() for ip in forwarded_for.split(",") if ip.strip()]
            if ips:
                return ips[0]
        # Check X-Real-IP
        real_ip = request.headers.get("x-real-ip")
        if real_ip and real_ip.strip():
            return real_ip.strip()

    return peer_ip


# ---------------------------------------------------------------------------
# Storage & Lockout Logic (Fail-Closed)
# ---------------------------------------------------------------------------

def _parse_timestamp(val) -> Optional[datetime]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, str):
        val_clean = val.replace("Z", "+00:00")
        dt = datetime.fromisoformat(val_clean)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


def is_key_blocked(key_hash: str, client=None) -> Tuple[bool, int, str]:
    """Check if a specific key hash is currently locked out.

    Returns
    -------
    tuple[bool, int, str]
        ``(is_blocked, remaining_seconds, blocked_reason)``
        where blocked_reason is ``"store_error"`` when the store is unreachable
        or ``""`` for normal (real-lockout or not-blocked) results.

    Fail-closed behavior:
    If the store is unreachable or queries fail, logs an error and returns
    ``(True, 60, "store_error")`` to ensure brute-force attempts cannot proceed undetected.
    """
    db = _get_supabase_client(client)
    if not db:
        logger.error("Supabase client is unavailable in lockout check. Failing closed.")
        return True, 60, "store_error"

    try:
        res = db.table("login_attempts").select("*").eq("key_hash", key_hash).execute()
        if not res.data:
            return False, 0, ""

        row = res.data[0]
        blocked_until = _parse_timestamp(row.get("blocked_until"))
        if not blocked_until:
            return False, 0, ""

        now = datetime.now(timezone.utc)
        if blocked_until > now:
            remaining = int((blocked_until - now).total_seconds())
            return True, max(1, remaining), ""

        return False, 0, ""
    except Exception as e:
        logger.error("Failed to query login_attempts table (%s). Store is unreachable; failing closed.", e)
        return True, 60, "store_error"


def check_lockout(device_id: str, client_ip: str, client=None) -> Tuple[bool, int, str]:
    """Check whether either the device or the IP is locked out.

    Device lockout is checked first; IP backstop is checked second.

    Returns
    -------
    tuple[bool, int, str]
        ``(is_locked, remaining_seconds, reason)`` where reason is
        ``"device"``, ``"ip"``, ``"store_error"``, or ``""``.
        ``"store_error"`` means the lockout store was unreachable (fail-closed),
        NOT a real lockout — callers should return 503 instead of 429.
    """
    # 1. Device check
    dev_hash = hash_key("device", device_id)
    blocked, remaining, blocked_reason = is_key_blocked(dev_hash, client=client)
    if blocked:
        if blocked_reason == "store_error":
            return True, remaining, "store_error"
        return True, remaining, "device"

    # 2. IP backstop check
    ip_hash = hash_key("ip", client_ip)
    blocked, remaining, blocked_reason = is_key_blocked(ip_hash, client=client)
    if blocked:
        if blocked_reason == "store_error":
            return True, remaining, "store_error"
        return True, remaining, "ip"

    return False, 0, ""


def record_key_failure(
    key_hash: str,
    max_attempts: int,
    lock_seconds: int,
    window_seconds: Optional[int] = None,
    client=None
) -> dict:
    """Atomically record a login failure via RPC ``record_login_attempt``.

    Non-atomic fallback removed: if the RPC is missing or fails, this function
    fails closed by logging a clear error message and returning a blocked state.
    """
    db = _get_supabase_client(client)
    now = datetime.now(timezone.utc)
    fallback_blocked_until = (now + timedelta(seconds=lock_seconds)).isoformat()

    if not db:
        logger.error("Supabase client unavailable when recording login failure. Failing closed.")
        return {
            "attempts": max_attempts,
            "is_blocked": True,
            "blocked_until": fallback_blocked_until,
        }

    try:
        rpc_params = {
            "p_key_hash": key_hash,
            "p_max_attempts": max_attempts,
            "p_lock_seconds": lock_seconds,
            "p_window_seconds": window_seconds,
        }
        rpc_res = db.rpc("record_login_attempt", rpc_params).execute()

        if rpc_res.data:
            data = rpc_res.data[0] if isinstance(rpc_res.data, list) else rpc_res.data
            return {
                "attempts": data.get("attempts", 1),
                "is_blocked": bool(data.get("is_blocked", False)),
                "blocked_until": data.get("blocked_until"),
            }
        logger.error("RPC record_login_attempt returned empty response. Failing closed.")
        return {
            "attempts": max_attempts,
            "is_blocked": True,
            "blocked_until": fallback_blocked_until,
        }
    except Exception as e:
        logger.error("RPC record_login_attempt failed or missing (%s). Failing closed.", e)
        return {
            "attempts": max_attempts,
            "is_blocked": True,
            "blocked_until": fallback_blocked_until,
        }


def record_failure(device_id: str, client_ip: str, client=None) -> dict:
    """Record a login failure against both the device and the IP backstop."""
    dev_hash = hash_key("device", device_id)
    dev_res = record_key_failure(
        dev_hash,
        max_attempts=DEVICE_MAX_FAILURES,
        lock_seconds=DEVICE_LOCK_SECONDS,
        window_seconds=DEVICE_WINDOW_SECONDS,
        client=client,
    )

    ip_hash = hash_key("ip", client_ip)
    ip_res = record_key_failure(
        ip_hash,
        max_attempts=IP_MAX_FAILURES,
        lock_seconds=IP_LOCK_SECONDS,
        window_seconds=IP_WINDOW_SECONDS,
        client=client,
    )

    return {"device": dev_res, "ip": ip_res}


def reset_lockout(device_id: str, client=None) -> None:
    """Reset attempts on successful login for the given device."""
    db = _get_supabase_client(client)
    if not db:
        return

    dev_hash = hash_key("device", device_id)
    try:
        db.table("login_attempts").delete().eq("key_hash", dev_hash).execute()
    except Exception as e:
        logger.warning("Failed to reset lockout for key %s: %s", dev_hash[:8], e)


def cleanup_old_attempts(older_than_seconds: int = 86400, client=None) -> int:
    """Remove expired login attempt records older than the threshold via RPC."""
    db = _get_supabase_client(client)
    if not db:
        return 0

    try:
        rpc_res = db.rpc(
            "cleanup_expired_login_attempts",
            {"p_older_than_seconds": older_than_seconds}
        ).execute()
        if rpc_res.data is not None:
            return int(rpc_res.data)
        return 0
    except Exception as e:
        logger.error("RPC cleanup_expired_login_attempts failed (%s).", e)
        return 0
