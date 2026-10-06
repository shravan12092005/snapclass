"""Tests for face-login lockout storage, rate-limiting, and trusted proxy handling.

Verifies:
1. Lock: 5 failures on a device triggers 60s lockout.
2. Expiry: Expired lock allows login and resets failure counter.
3. Reset on success: Successful login clears failure counter.
4. Two devices on one IP: One device locking out does NOT lock out another device on the same IP;
   IP backstop only triggers when total IP failures reach threshold (30).
5. Trusted-proxy IP handling: Header spoofing ignored when peer is not in TRUSTED_PROXIES.
6. Device cookie helpers: Secure cookie attributes and random ID generation.
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
    record_failure,
    reset_lockout,
    set_device_cookie,
    cleanup_old_attempts,
)


class MockTable:
    def __init__(self, data_store):
        self.data_store = data_store
        self._filters = {}
        self._action = "select"
        self._upsert_data = None

    def select(self, *args):
        self._action = "select"
        return self

    def eq(self, col, val):
        self._filters[col] = val
        return self

    def lt(self, col, val):
        self._filters[f"{col}__lt"] = val
        return self

    def upsert(self, data):
        self._action = "upsert"
        self._upsert_data = data
        return self

    def delete(self):
        self._action = "delete"
        return self

    def execute(self):
        if self._action == "upsert":
            key = self._upsert_data["key_hash"]
            self.data_store[key] = dict(self._upsert_data)
            return MagicMock(data=[self.data_store[key]])
        elif self._action == "delete":
            deleted = []
            keys_to_remove = []
            for k, row in list(self.data_store.items()):
                match = True
                for col, val in self._filters.items():
                    if col.endswith("__lt"):
                        base_col = col[:-4]
                        if not (row.get(base_col, "") < val):
                            match = False
                    elif row.get(col) != val:
                        match = False
                if match:
                    keys_to_remove.append(k)
                    deleted.append(row)
            for k in keys_to_remove:
                del self.data_store[k]
            return MagicMock(data=deleted)
        else:  # select
            results = []
            for k, row in self.data_store.items():
                match = True
                for col, val in self._filters.items():
                    if row.get(col) != val:
                        match = False
                if match:
                    results.append(row)
            return MagicMock(data=results)


class MockSupabase:
    def __init__(self):
        self.data_store = {}

    def table(self, table_name):
        return MockTable(self.data_store)

    def rpc(self, name, params):
        # Force table-fallback path in unit tests to test atomic upsert logic
        mock = MagicMock()
        mock.execute.side_effect = Exception("RPC not in test env")
        return mock


class TestLockout(unittest.TestCase):

    def setUp(self):
        self.db = MockSupabase()

    # -----------------------------------------------------------------------
    # 1. Lock test: 5 failures = 60s lockout
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
            if "device" in k or True:
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

        # Device B on the same IP must NOT be locked out!
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
    # 5. Trusted proxy IP handling
    # -----------------------------------------------------------------------
    def test_trusted_proxy_ip_handling(self):
        # Case A: Untrusted peer -> ignore X-Forwarded-For
        untrusted_req = MagicMock()
        untrusted_req.client.host = "203.0.113.5"
        untrusted_req.headers = {"x-forwarded-for": "198.51.100.1, 10.0.0.1"}

        with patch("app.lockout.TRUSTED_PROXIES", {"127.0.0.1", "10.0.0.1"}):
            resolved_ip = get_client_ip(untrusted_req)
            self.assertEqual(resolved_ip, "203.0.113.5", "Must ignore spoofed header from untrusted peer")

        # Case B: Trusted proxy peer -> parse leftmost client IP from X-Forwarded-For
        trusted_req = MagicMock()
        trusted_req.client.host = "10.0.0.1"
        trusted_req.headers = {"x-forwarded-for": "203.0.113.99, 10.0.0.1"}

        with patch("app.lockout.TRUSTED_PROXIES", {"10.0.0.1"}):
            resolved_ip = get_client_ip(trusted_req)
            self.assertEqual(resolved_ip, "203.0.113.99", "Must extract real client IP from trusted proxy")

    # -----------------------------------------------------------------------
    # 6. Device cookie generation & attributes
    # -----------------------------------------------------------------------
    def test_device_cookie_lifecycle(self):
        # 1. New request without cookie gets a generated ID
        req = MagicMock()
        req.cookies = {}
        dev_id, is_new = get_or_create_device_id(req)
        self.assertTrue(is_new)
        self.assertEqual(len(dev_id), 32)  # 16 bytes hex

        # 2. Existing request reuses cookie
        req.cookies = {DEVICE_COOKIE_NAME: dev_id}
        reused_id, is_new = get_or_create_device_id(req)
        self.assertFalse(is_new)
        self.assertEqual(reused_id, dev_id)

        # 3. Response cookie has secure attributes
        resp = Response()
        set_device_cookie(resp, dev_id)
        cookie_header = resp.headers.get("set-cookie", "").lower()
        self.assertIn(DEVICE_COOKIE_NAME.lower(), cookie_header)
        self.assertIn("httponly", cookie_header)
        self.assertIn("secure", cookie_header)
        self.assertIn("samesite=lax", cookie_header)


if __name__ == "__main__":
    unittest.main()
