"""Tests for app.compat — cache_data, cache_resource, _Secrets.

Verifies: deep copies, TTL expiry, .clear(), thread safety, secrets from env.
"""

import os
import threading
import time
import unittest

from app.compat import _Secrets, cache_data, cache_resource


class TestCacheData(unittest.TestCase):

    def test_returns_deep_copy(self):
        """cache_data must return deep copies (Streamlit semantics)."""
        call_count = {"n": 0}

        @cache_data
        def get_list():
            call_count["n"] += 1
            return [1, 2, 3]

        try:
            a = get_list()
            b = get_list()

            self.assertEqual(a, b)
            self.assertIsNot(a, b)  # different objects

            a.append(4)
            c = get_list()
            self.assertEqual(c, [1, 2, 3])  # mutation doesn't affect cache

            self.assertEqual(call_count["n"], 1)  # only called once
        finally:
            get_list.clear()

    def test_ttl_expiry(self):
        @cache_data(ttl=0.1)
        def get_time():
            return time.time()

        try:
            t1 = get_time()
            time.sleep(0.05)
            t2 = get_time()
            self.assertEqual(t1, t2)  # still cached

            time.sleep(0.1)
            t3 = get_time()
            self.assertNotEqual(t1, t3)  # expired
        finally:
            get_time.clear()

    def test_clear(self):
        @cache_data
        def get_val():
            return time.time()

        try:
            t1 = get_val()
            get_val.clear()
            t2 = get_val()
            self.assertNotEqual(t1, t2)
        finally:
            get_val.clear()

    def test_thread_safety(self):
        counter = {"value": 0}
        lock = threading.Lock()

        @cache_data
        def expensive():
            with lock:
                counter["value"] += 1
            time.sleep(0.01)
            return counter["value"]

        try:
            results = []

            def worker():
                results.append(expensive())

            threads = [threading.Thread(target=worker) for _ in range(10)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            # All threads get the same value (deep copied)
            self.assertTrue(all(r == results[0] for r in results))
        finally:
            expensive.clear()


class TestCacheResource(unittest.TestCase):

    def test_returns_same_object(self):
        """cache_resource returns the SAME object (no deep copy)."""
        @cache_resource
        def get_list():
            return [1, 2, 3]

        try:
            a = get_list()
            b = get_list()
            self.assertIs(a, b)
        finally:
            get_list.clear()

    def test_clear(self):
        @cache_resource
        def get_obj():
            return object()

        try:
            o1 = get_obj()
            get_obj.clear()
            o2 = get_obj()
            self.assertIsNot(o1, o2)
        finally:
            get_obj.clear()


class TestSecrets(unittest.TestCase):

    def test_getitem(self):
        os.environ["_TEST_SECRET_COMPAT"] = "value123"
        try:
            secrets = _Secrets()
            self.assertEqual(secrets["_TEST_SECRET_COMPAT"], "value123")
        finally:
            del os.environ["_TEST_SECRET_COMPAT"]

    def test_getitem_missing(self):
        secrets = _Secrets()
        with self.assertRaises(KeyError):
            _ = secrets["_NONEXISTENT_SECRET_KEY_COMPAT"]

    def test_get_with_default(self):
        secrets = _Secrets()
        self.assertEqual(secrets.get("_NONEXISTENT_COMPAT", "fallback"), "fallback")

    def test_get_existing(self):
        os.environ["_TEST_SECRET_GET"] = "found"
        try:
            secrets = _Secrets()
            self.assertEqual(secrets.get("_TEST_SECRET_GET", "default"), "found")
        finally:
            del os.environ["_TEST_SECRET_GET"]


if __name__ == "__main__":
    unittest.main()
