"""Drop-in replacement for Streamlit APIs used in service files.

Provides:
- ``cache_resource``: same-object caching (like st.cache_resource)
- ``cache_data``: deep-copy caching with TTL (like st.cache_data)
- ``st.secrets``: reads from environment variables
- ``st.error/toast/warning``: log instead of rendering UI
"""

import copy
import functools
import logging
import os
import threading
import time

logger = logging.getLogger("snapclass")


# ---------------------------------------------------------------------------
# Secrets
# ---------------------------------------------------------------------------

class _Secrets:
    """Mimics ``st.secrets`` — reads from environment variables."""

    def __getitem__(self, key):
        val = os.environ.get(key)
        if val is None:
            raise KeyError(f"Secret {key!r} not found in environment")
        return val

    def get(self, key, default=None):
        return os.environ.get(key, default)


# ---------------------------------------------------------------------------
# cache_resource — returns the SAME object on each call
# ---------------------------------------------------------------------------

def cache_resource(func=None, *, ttl=None):
    """Replacement for ``@st.cache_resource``.

    Returns the *same* object on subsequent calls (no deep copy).
    Thread-safe.  Supports ``.clear()`` and optional ``ttl`` (seconds).
    """

    def decorator(fn):
        _lock = threading.Lock()
        _cache = {}
        _timestamps = {}

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = _make_key(args, kwargs)
            with _lock:
                if key in _cache:
                    if ttl is not None and (time.time() - _timestamps[key]) > ttl:
                        del _cache[key]
                        del _timestamps[key]
                    else:
                        return _cache[key]

            result = fn(*args, **kwargs)

            with _lock:
                _cache[key] = result
                _timestamps[key] = time.time()

            return result

        def clear():
            with _lock:
                _cache.clear()
                _timestamps.clear()

        wrapper.clear = clear
        return wrapper

    if func is not None:
        # Called as @cache_resource (no parentheses)
        return decorator(func)
    # Called as @cache_resource() or @cache_resource(ttl=…)
    return decorator


# ---------------------------------------------------------------------------
# cache_data — returns DEEP COPIES (Streamlit semantics)
# ---------------------------------------------------------------------------

def cache_data(func=None, *, ttl=None):
    """Replacement for ``@st.cache_data``.

    Returns *deep copies* on each call (matching Streamlit semantics).
    Thread-safe.  Supports ``.clear()`` and optional ``ttl`` (seconds).
    """

    def decorator(fn):
        _lock = threading.Lock()
        _cache = {}
        _timestamps = {}

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = _make_key(args, kwargs)
            with _lock:
                if key in _cache:
                    if ttl is not None and (time.time() - _timestamps[key]) > ttl:
                        del _cache[key]
                        del _timestamps[key]
                    else:
                        return copy.deepcopy(_cache[key])

            result = fn(*args, **kwargs)

            with _lock:
                _cache[key] = result
                _timestamps[key] = time.time()

            return copy.deepcopy(result)

        def clear():
            with _lock:
                _cache.clear()
                _timestamps.clear()

        wrapper.clear = clear
        return wrapper

    if func is not None:
        return decorator(func)
    return decorator


# ---------------------------------------------------------------------------
# Key builder
# ---------------------------------------------------------------------------

def _make_key(args, kwargs):
    """Build a hashable cache key from function arguments."""
    return (args, tuple(sorted(kwargs.items())))


# ---------------------------------------------------------------------------
# st compatibility namespace
# ---------------------------------------------------------------------------

class _StCompat:
    """Namespace that mimics the ``st`` module for service files."""

    secrets = _Secrets()
    cache_resource = staticmethod(cache_resource)
    cache_data = staticmethod(cache_data)

    @staticmethod
    def error(msg):
        logger.error(msg)

    @staticmethod
    def toast(msg, **kwargs):
        logger.info(msg)

    @staticmethod
    def warning(msg):
        logger.warning(msg)


st = _StCompat()
