"""Tests for face-login lockout storage, rate-limiting, and trusted proxy handling.

Verifies:
1. Lock: 5 failures on a device triggers 60s lockout via atomic RPC.
2. Expiry: Expired lock allows login and resets failure counter.
3. Reset on success: Successful login clears failure counter.
4. Two devices on one IP: One device locking out does NOT lock out another device on the same IP;
   IP backstop only triggers when total IP failures reach threshold (30).
5. Fail-closed behavior: If store or RPC is unreachable, fails closed with log.
6. HMAC-SHA256: Server secret is used to hash keys.
7. Configurable Secure flag: COOKIE_SECURE env var controls cookie security attribute.
8. Trusted-proxy IP handling: Header spoofing ignored when peer is not in TRUSTED_PROXIES.
"""

from datetime import datetime, timezone, timedelta
import os
os.environ.setdefault("DEV_MODE", "true")
import unittest
from unittest.mock import MagicMock, patch

from fastapi import Response

from app.lockout import (
    DEVICE_COOKIE_NAME,
    DEVICE_MAX_FAILURES,
    DEVICE_LOCK_SECONDS,
    IP_MAX_FAILURES,
    check_lockout,
    get_client_ip,
    get_or_create_device_id,
    hash_key,
    record_failure,
    record_key_failure,
    reset_lockout,
    set_device_cookie,
)


class MockTable:
    def __init__(self, data_store):
        self.data_store = data_store
        self._filters = {}
        self._action = "select"

    def select(self, *args):
        self._action = "select"
        return self

    def eq(self, col, val):
        self._filters[col] = val
        return self

    def delete(self):
        self._action = "delete"
        return self

    def execute(self):
        if self._action == "delete":
            key = self._filters.get("key_hash")
            if key and key in self.data_store:
                return MagicMock(data=[self.data_store.pop(key)])
            return MagicMock(data=[])

        # Handle select
        results = []
        for k, row in self.data_store.items():
            match = True
            for col, val in self._filters.items():
                if row.get(col) != val:
                    match = False
            if match:
                results.append(row)
        return MagicMock(data=results)


import threading


class MockSupabaseWithRPC:
    """Mock simulating Supabase client and PostgreSQL record_login_attempt RPC."""

    def __init__(self):
        self.data_store = {}
        self._lock = threading.Lock()

    def table(self, table_name):
        return MockTable(self.data_store)

    def rpc(self, name, params):
        mock = MagicMock()
        if name == "record_login_attempt":
            with self._lock:
                key = params["p_key_hash"]
                max_attempts = params["p_max_attempts"]
                lock_seconds = params["p_lock_seconds"]
                window_seconds = params.get("p_window_seconds")

                now = datetime.now(timezone.utc)
                existing = self.data_store.get(key)

                if existing:
                    blocked_until_str = existing.get("blocked_until")
                    blocked_until = (
                        datetime.fromisoformat(blocked_until_str.replace("Z", "+00:00"))
                        if blocked_until_str
                        else None
                    )
                    updated_at_str = existing.get("updated_at")
                    updated_at = (
                        datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                        if updated_at_str
                        else None
                    )

                    # Case 1: Already blocked -> increment attempts, but DO NOT extend blocked_until
                    if blocked_until and blocked_until > now:
                        attempts = existing["attempts"] + 1
                        new_blocked_until = blocked_until_str
                    # Case 2 & 3: Previous block expired OR window expired -> reset to 1
                    elif (blocked_until and blocked_until <= now) or (
                        window_seconds is not None
                        and updated_at
                        and (now - updated_at).total_seconds() > window_seconds
                    ):
                        attempts = 1
                        new_blocked_until = (
                            (now + timedelta(seconds=lock_seconds)).isoformat()
                            if attempts >= max_attempts
                            else None
                        )
                    # Case 4: Normal increment within active window
                    else:
                        attempts = existing["attempts"] + 1
                        new_blocked_until = (
                            (now + timedelta(seconds=lock_seconds)).isoformat()
                            if attempts >= max_attempts
                            else None
                        )
                else:
                    attempts = 1
                    new_blocked_until = (
                        (now + timedelta(seconds=lock_seconds)).isoformat()
                        if attempts >= max_attempts
                        else None
                    )

                self.data_store[key] = {
                    "key_hash": key,
                    "attempts": attempts,
                    "blocked_until": new_blocked_until,
                    "updated_at": now.isoformat(),
                }

                is_blocked = bool(
                    new_blocked_until
                    and datetime.fromisoformat(new_blocked_until.replace("Z", "+00:00")) > now
                )
                result_data = [{
                    "attempts": attempts,
                    "blocked_until": new_blocked_until,
                    "is_blocked": is_blocked,
                }]
                mock.execute.return_value = MagicMock(data=result_data)
                return mock
        elif name == "cleanup_expired_login_attempts":
            mock.execute.return_value = MagicMock(data=1)
            return mock

        mock.execute.return_value = MagicMock(data=[])
        return mock


class TestLockout(unittest.TestCase):

    def setUp(self):
        self.db = MockSupabaseWithRPC()

    # -----------------------------------------------------------------------
    # 1. Lock test: 5 failures = 60s lockout via atomic RPC
    # -----------------------------------------------------------------------
    def test_lock_after_five_failures(self):
        device_id = "test-device-123"
        ip = "192.168.1.10"

        # Failures 1 through 4 should NOT lock out
        for i in range(1, 5):
            record_failure(device_id, ip, client=self.db)
            is_locked, remaining, reason = check_lockout(device_id, ip, client=self.db)
            self.assertFalse(is_locked, f"Should not be locked at attempt {i}")
            self.assertEqual(remaining, 0)

        # 5th failure must trigger lock
        record_failure(device_id, ip, client=self.db)
        is_locked, remaining, reason = check_lockout(device_id, ip, client=self.db)
        self.assertTrue(is_locked)
        self.assertEqual(reason, "device")
        self.assertGreaterEqual(remaining, 58)
        self.assertLessEqual(remaining, 60)

    # -----------------------------------------------------------------------
    # 2. Expiry test: Lock expires after duration
    # -----------------------------------------------------------------------
    def test_lock_expiry(self):
        device_id = "test-device-expiry"
        ip = "192.168.1.20"

        # Trigger lockout (5 failures)
        for _ in range(5):
            record_failure(device_id, ip, client=self.db)

        is_locked, remaining, _ = check_lockout(device_id, ip, client=self.db)
        self.assertTrue(is_locked)

        # Simulate expiry by setting blocked_until to the past
        past_time = (datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat()
        for k in self.db.data_store:
            self.db.data_store[k]["blocked_until"] = past_time

        # Check lockout again: should now be unlocked
        is_locked, remaining, _ = check_lockout(device_id, ip, client=self.db)
        self.assertFalse(is_locked)
        self.assertEqual(remaining, 0)

        # Next failure after expiry resets attempt count to 1
        dev_res = record_failure(device_id, ip, client=self.db)["device"]
        self.assertEqual(dev_res["attempts"], 1)
        self.assertFalse(dev_res["is_blocked"])

    # -----------------------------------------------------------------------
    # 3. Reset on success
    # -----------------------------------------------------------------------
    def test_reset_on_success(self):
        device_id = "test-device-reset"
        ip = "192.168.1.30"

        # 3 failed attempts
        for _ in range(3):
            record_failure(device_id, ip, client=self.db)

        # Successful login triggers reset
        reset_lockout(device_id, client=self.db)

        # Check lockout is False
        is_locked, _, _ = check_lockout(device_id, ip, client=self.db)
        self.assertFalse(is_locked)

        # Subsequent failure starts from attempt 1, NOT attempt 4
        res = record_failure(device_id, ip, client=self.db)
        self.assertEqual(res["device"]["attempts"], 1)

    # -----------------------------------------------------------------------
    # 4. Two devices on one IP (Classroom scenario)
    # -----------------------------------------------------------------------
    def test_two_devices_on_one_ip(self):
        shared_ip = "10.0.0.50"
        device_a = "student-phone-a"
        device_b = "student-laptop-b"

        # Device A fails 5 times and gets locked out
        for _ in range(5):
            record_failure(device_a, shared_ip, client=self.db)

        # Device A is locked
        locked_a, remaining_a, reason_a = check_lockout(device_a, shared_ip, client=self.db)
        self.assertTrue(locked_a)
        self.assertEqual(reason_a, "device")

        # Device B on the same IP must NOT be locked out
        locked_b, remaining_b, reason_b = check_lockout(device_b, shared_ip, client=self.db)
        self.assertFalse(locked_b, "Device B must not be locked out by Device A's failures")
        self.assertEqual(remaining_b, 0)

        # If IP reaches 30 total failures, IP backstop triggers
        for _ in range(25):  # 5 from A + 25 more = 30
            record_failure("device-other", shared_ip, client=self.db)

        locked_b_after_30, _, reason_b_after_30 = check_lockout(device_b, shared_ip, client=self.db)
        self.assertTrue(locked_b_after_30)
        self.assertEqual(reason_b_after_30, "ip")

    # -----------------------------------------------------------------------
    # 5. Fail-Closed behavior when RPC or store is unreachable
    # -----------------------------------------------------------------------
    def test_fail_closed_on_unreachable_store(self):
        failing_db = MagicMock()
        failing_db.rpc.side_effect = Exception("Connection timed out to Supabase")
        failing_db.table.side_effect = Exception("Connection timed out to Supabase")

        # 1. Recording failure must fail closed (treat as blocked)
        res = record_key_failure("some-hash", 5, 60, client=failing_db)
        self.assertTrue(res["is_blocked"])
        self.assertEqual(res["attempts"], 5)

        # 2. Checking lockout on unreachable store must fail closed (treat as blocked)
        is_locked, remaining, _ = check_lockout("dev1", "1.2.3.4", client=failing_db)
        self.assertTrue(is_locked)
        self.assertEqual(remaining, 60)

    # -----------------------------------------------------------------------
    # 6. HMAC-SHA256 key hashing
    # -----------------------------------------------------------------------
    def test_hmac_sha256_key_hashing(self):
        with patch("app.lockout.LOCKOUT_SECRET", "secret-key-1"):
            hash1 = hash_key("device", "dev-123")

        with patch("app.lockout.LOCKOUT_SECRET", "secret-key-2"):
            hash2 = hash_key("device", "dev-123")

        self.assertNotEqual(hash1, hash2, "Different server secrets must produce different HMACs")
        self.assertEqual(len(hash1), 64, "HMAC-SHA256 must be 64 hex characters")

    # -----------------------------------------------------------------------
    # 7. Configurable COOKIE_SECURE flag
    # -----------------------------------------------------------------------
    def test_configurable_cookie_secure(self):
        # Default / true -> secure attribute present
        resp_secure = Response()
        with patch("app.lockout.COOKIE_SECURE", True):
            set_device_cookie(resp_secure, "dev-1")
            self.assertIn("secure", resp_secure.headers.get("set-cookie", "").lower())

        # Configured false -> secure attribute absent (e.g. local dev HTTP)
        resp_insecure = Response()
        with patch("app.lockout.COOKIE_SECURE", False):
            set_device_cookie(resp_insecure, "dev-1")
            self.assertNotIn("secure", resp_insecure.headers.get("set-cookie", "").lower())

    # -----------------------------------------------------------------------
    # 8. Trusted proxy IP handling
    # -----------------------------------------------------------------------
    def test_trusted_proxy_ip_handling(self):
        untrusted_req = MagicMock()
        untrusted_req.client.host = "203.0.113.5"
        untrusted_req.headers = {"x-forwarded-for": "198.51.100.1, 10.0.0.1"}

        with patch("app.lockout.TRUSTED_PROXIES", {"127.0.0.1", "10.0.0.1"}):
            resolved_ip = get_client_ip(untrusted_req)
            self.assertEqual(resolved_ip, "203.0.113.5", "Must ignore spoofed header from untrusted peer")

        trusted_req = MagicMock()
        trusted_req.client.host = "10.0.0.1"
        trusted_req.headers = {"x-forwarded-for": "203.0.113.99, 10.0.0.1"}

        with patch("app.lockout.TRUSTED_PROXIES", {"10.0.0.1"}):
            resolved_ip = get_client_ip(trusted_req)
            self.assertEqual(resolved_ip, "203.0.113.99", "Must extract real client IP from trusted proxy")

    # -----------------------------------------------------------------------
    # 9. Concurrent failure attempts simulation (Race Condition Protection)
    # -----------------------------------------------------------------------
    def test_concurrent_failures_thread_safety(self):
        from concurrent.futures import ThreadPoolExecutor

        device_id = "concurrent-device-test"
        ip = "192.168.1.99"

        # Fire 10 simultaneous failed login attempts across multiple worker threads
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(record_failure, device_id, ip, client=self.db)
                for _ in range(10)
            ]
            [f.result() for f in futures]

        is_locked, remaining, reason = check_lockout(device_id, ip, client=self.db)
        self.assertTrue(is_locked)
        self.assertEqual(reason, "device")

        dev_hash = hash_key("device", device_id)
        # All 10 failures recorded without race-condition lost updates
        self.assertEqual(self.db.data_store[dev_hash]["attempts"], 10)

    # -----------------------------------------------------------------------
    # 10. Active lock is NOT extended on subsequent failure (DoS protection)
    # -----------------------------------------------------------------------
    def test_active_lock_not_extended_on_subsequent_failure(self):
        device_id = "device-lock-extend-test"
        ip = "192.168.1.101"

        # Trigger 5 failures -> locks device
        for _ in range(5):
            record_failure(device_id, ip, client=self.db)

        dev_hash = hash_key("device", device_id)
        original_blocked_until = self.db.data_store[dev_hash]["blocked_until"]
        self.assertIsNotNone(original_blocked_until)

        # 6th failure while still locked
        res = record_failure(device_id, ip, client=self.db)
        self.assertTrue(res["device"]["is_blocked"])
        self.assertEqual(res["device"]["blocked_until"], original_blocked_until)
        # Verify blocked_until in database store was NOT extended
        self.assertEqual(
            self.db.data_store[dev_hash]["blocked_until"],
            original_blocked_until,
            "blocked_until must NOT be extended while the key is already blocked"
        )

    # -----------------------------------------------------------------------
    # 11. IP window resets attempts after window expires (p_window_seconds)
    # -----------------------------------------------------------------------
    def test_ip_window_resets_attempts_after_window_seconds(self):
        device_id = "device-ip-window-test"
        ip = "198.51.100.77"

        # Record 4 failures for this IP
        for _ in range(4):
            record_failure(device_id, ip, client=self.db)

        ip_hash = hash_key("ip", ip)
        self.assertEqual(self.db.data_store[ip_hash]["attempts"], 4)

        # Simulate 15 minutes elapsed (window is 10 min = 600 seconds)
        fifteen_minutes_ago = (datetime.now(timezone.utc) - timedelta(seconds=900)).isoformat()
        self.db.data_store[ip_hash]["updated_at"] = fifteen_minutes_ago

        # Record a new failure from a different device on the same IP
        res = record_failure("another-device", ip, client=self.db)

        # IP attempts must have reset to 1 (not incremented to 5)
        self.assertEqual(res["ip"]["attempts"], 1)
        self.assertFalse(res["ip"]["is_blocked"])
        self.assertEqual(self.db.data_store[ip_hash]["attempts"], 1)

    # -----------------------------------------------------------------------
    # 12. Per-device counter persists across time (long window / today's semantics)
    # -----------------------------------------------------------------------
    def test_device_counter_persists_across_time(self):
        device_id = "device-persists-test"
        ip = "192.168.1.102"

        # Record 4 failures
        for _ in range(4):
            record_failure(device_id, ip, client=self.db)

        dev_hash = hash_key("device", device_id)
        self.assertEqual(self.db.data_store[dev_hash]["attempts"], 4)

        # Simulate 10 days passing for the device
        ten_days_ago = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        self.db.data_store[dev_hash]["updated_at"] = ten_days_ago

        # 5th failure arrives: per-device counter persists until success or lock
        res = record_failure(device_id, ip, client=self.db)

        # Device should lock on 5th attempt
        self.assertEqual(res["device"]["attempts"], 5)
        self.assertTrue(res["device"]["is_blocked"])

    # -----------------------------------------------------------------------
    # 13. Secrets refuse to start without DEV_MODE=true
    # -----------------------------------------------------------------------
    def test_secrets_refuse_to_start_without_dev_mode(self):
        import subprocess
        import sys

        # 1. Missing SESSION_SECRET and DEV_MODE="" -> fails at import
        env_no_secret = {k: v for k, v in os.environ.items() if k not in ("SESSION_SECRET", "LOCKOUT_SECRET", "DEV_MODE")}
        cmd_auth = [sys.executable, "-c", "from app.auth import SESSION_SECRET"]
        proc_auth = subprocess.run(cmd_auth, capture_output=True, text=True, env=env_no_secret)
        self.assertNotEqual(proc_auth.returncode, 0)
        self.assertIn("SESSION_SECRET environment variable is missing", proc_auth.stderr)

        # 2. Missing LOCKOUT_SECRET and DEV_MODE="" -> fails at import
        cmd_lockout = [sys.executable, "-c", "from app.lockout import LOCKOUT_SECRET"]
        proc_lockout = subprocess.run(cmd_lockout, capture_output=True, text=True, env=env_no_secret)
        self.assertNotEqual(proc_lockout.returncode, 0)
        self.assertIn("LOCKOUT_SECRET environment variable is missing", proc_lockout.stderr)

        # 3. With DEV_MODE=true -> starts successfully
        env_dev = dict(env_no_secret, DEV_MODE="true")
        proc_auth_dev = subprocess.run(cmd_auth, capture_output=True, text=True, env=env_dev)
        self.assertEqual(proc_auth_dev.returncode, 0)
        proc_lockout_dev = subprocess.run(cmd_lockout, capture_output=True, text=True, env=env_dev)
        self.assertEqual(proc_lockout_dev.returncode, 0)


if __name__ == "__main__":
    unittest.main()
