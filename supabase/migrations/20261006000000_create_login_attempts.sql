-- ==========================================================================
-- Migration: Create login_attempts table and atomic helper functions
--
-- Supports:
--   - Device-ID cookie keyed lockout (5 failures = 60s)
--   - Per-IP backstop (default 30 failures / 10 min)
--   - Atomic upsert via record_login_attempt()
--   - Periodic cleanup via cleanup_expired_login_attempts()
--   - Strict security: RLS enabled with NO policies (service_role only)
--   - RPC execution revoked from public/anon/authenticated
-- ==========================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
    key_hash        TEXT PRIMARY KEY,
    attempts        INTEGER NOT NULL DEFAULT 1,
    blocked_until   TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_updated_at ON login_attempts(updated_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked_until ON login_attempts(blocked_until);

-- Enable Row Level Security (RLS) with NO policies:
-- Only service_role (backend server) can select/insert/update/delete.
-- anon and authenticated users have zero access to this table.
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Atomic upsert: increments attempts, calculates block time, and returns new state.
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_key_hash TEXT,
    p_max_attempts INT,
    p_lock_seconds INT
)
RETURNS TABLE (
    attempts INT,
    blocked_until TIMESTAMPTZ,
    is_blocked BOOLEAN
) LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_attempts INT := 1;
    v_blocked_until TIMESTAMPTZ := NULL;
    v_existing RECORD;
BEGIN
    SELECT * INTO v_existing FROM login_attempts WHERE key_hash = p_key_hash FOR UPDATE;

    IF FOUND THEN
        -- If previous block expired, reset attempts to 1
        IF v_existing.blocked_until IS NOT NULL AND v_existing.blocked_until <= v_now THEN
            v_attempts := 1;
        ELSE
            v_attempts := v_existing.attempts + 1;
        END IF;

        IF v_attempts >= p_max_attempts THEN
            v_blocked_until := v_now + (p_lock_seconds || ' seconds')::interval;
        ELSE
            v_blocked_until := NULL;
        END IF;

        UPDATE login_attempts
        SET attempts = v_attempts,
            blocked_until = v_blocked_until,
            updated_at = v_now
        WHERE key_hash = p_key_hash;
    ELSE
        IF v_attempts >= p_max_attempts THEN
            v_blocked_until := v_now + (p_lock_seconds || ' seconds')::interval;
        END IF;

        INSERT INTO login_attempts (key_hash, attempts, blocked_until, updated_at)
        VALUES (p_key_hash, v_attempts, v_blocked_until, v_now);
    END IF;

    RETURN QUERY SELECT v_attempts, v_blocked_until, (v_blocked_until IS NOT NULL AND v_blocked_until > v_now);
END;
$$;

-- Periodic cleanup: deletes expired records older than p_older_than_seconds
CREATE OR REPLACE FUNCTION cleanup_expired_login_attempts(
    p_older_than_seconds INT DEFAULT 86400
)
RETURNS INT LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    DELETE FROM login_attempts
    WHERE updated_at < timezone('utc'::text, now()) - (p_older_than_seconds || ' seconds')::interval
      AND (blocked_until IS NULL OR blocked_until < timezone('utc'::text, now()));
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Revoke execute permissions from PUBLIC, anon, authenticated
REVOKE EXECUTE ON FUNCTION record_login_attempt(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION cleanup_expired_login_attempts(INT) FROM PUBLIC, anon, authenticated;

-- Grant execution strictly to service_role (backend service only)
GRANT EXECUTE ON FUNCTION record_login_attempt(TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_login_attempts(INT) TO service_role;
