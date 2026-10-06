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


class MockSupabaseWithRPC:
    """Mock simulating Supabase client and PostgreSQL record_login_attempt RPC."""

    def __init__(self):
        self.data_store = {}

    def table(self, table_name):
        return MockTable(self.data_store)

    def rpc(self, name, params):
        mock = MagicMock()
        if name == "record_login_attempt":
            key = params["p_key_hash"]
            max_attempts = params["p_max_attempts"]
            lock_seconds = params["p_lock_seconds"]

            now = datetime.now(timezone.utc)
            existing = self.data_store.get(key)

            if existing:
                blocked_until_str = existing.get("blocked_until")
                blocked_until = (
                    datetime.fromisoformat(blocked_until_str.replace("Z", "+00:00"))
                    if blocked_until_str
                    else None
                )
                if blocked_until and blocked_until <= now:
                    attempts = 1
                else:
                    attempts = existing["attempts"] + 1
            else:
                attempts = 1

            new_blocked_until = None
            if attempts >= max_attempts:
                new_blocked_until = (now + timedelta(seconds=lock_seconds)).isoformat()

            self.data_store[key] = {
                "key_hash": key,
                "attempts": attempts,
                "blocked_until": new_blocked_until,
                "updated_at": now.isoformat(),
            }

            result_data = [{
                "attempts": attempts,
                "blocked_until": new_blocked_until,
                "is_blocked": bool(new_blocked_until),
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


if __name__ == "__main__":
    unittest.main()
