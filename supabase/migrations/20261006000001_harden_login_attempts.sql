-- ==========================================================================
-- Migration: Harden login_attempts atomic function and time window
--
-- Hardening improvements:
--   1. Added p_window_seconds parameter for sliding window rate limiting.
--      If updated_at is older than the window and the key is not currently
--      blocked, attempts reset to 1.
--   2. Atomic INSERT ... ON CONFLICT (key_hash) DO UPDATE eliminates race
--      conditions and SELECT ... FOR UPDATE roundtrips.
--   3. Already-blocked keys DO NOT extend blocked_until on subsequent failures.
--   4. SET search_path = public added to both SECURITY DEFINER functions.
--   5. Function permissions properly restricted to service_role only.
-- ==========================================================================

-- Drop previous 3-parameter function signature to prevent overload ambiguity
DROP FUNCTION IF EXISTS record_login_attempt(TEXT, INT, INT);

-- Atomic upsert: increments attempts, calculates block time, and returns new state.
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_key_hash TEXT,
    p_max_attempts INT,
    p_lock_seconds INT,
    p_window_seconds INT DEFAULT NULL
)
RETURNS TABLE (
    attempts INT,
    blocked_until TIMESTAMPTZ,
    is_blocked BOOLEAN
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    RETURN QUERY
    INSERT INTO login_attempts (key_hash, attempts, blocked_until, updated_at)
    VALUES (
        p_key_hash,
        1,
        CASE WHEN 1 >= p_max_attempts THEN v_now + (p_lock_seconds || ' seconds')::interval ELSE NULL END,
        v_now
    )
    ON CONFLICT (key_hash) DO UPDATE
    SET
        attempts = CASE
            -- If previous block expired OR window expired (and not currently blocked), reset to 1
            WHEN (login_attempts.blocked_until IS NOT NULL AND login_attempts.blocked_until <= v_now)
              OR (p_window_seconds IS NOT NULL AND (login_attempts.blocked_until IS NULL OR login_attempts.blocked_until <= v_now) AND login_attempts.updated_at < v_now - (p_window_seconds || ' seconds')::interval) THEN
                1
            -- Otherwise increment attempt counter (including during active block)
            ELSE
                login_attempts.attempts + 1
        END,
        blocked_until = CASE
            -- If currently blocked, DO NOT extend blocked_until
            WHEN login_attempts.blocked_until IS NOT NULL AND login_attempts.blocked_until > v_now THEN
                login_attempts.blocked_until
            -- If previous block expired OR window expired, check if 1 attempt immediately locks
            WHEN (login_attempts.blocked_until IS NOT NULL AND login_attempts.blocked_until <= v_now)
              OR (p_window_seconds IS NOT NULL AND (login_attempts.blocked_until IS NULL OR login_attempts.blocked_until <= v_now) AND login_attempts.updated_at < v_now - (p_window_seconds || ' seconds')::interval) THEN
                CASE WHEN 1 >= p_max_attempts THEN v_now + (p_lock_seconds || ' seconds')::interval ELSE NULL END
            -- Otherwise lock if incremented attempts reach max threshold
            WHEN (login_attempts.attempts + 1) >= p_max_attempts THEN
                v_now + (p_lock_seconds || ' seconds')::interval
            ELSE
                NULL
        END,
        updated_at = v_now
    RETURNING
        login_attempts.attempts,
        login_attempts.blocked_until,
        (login_attempts.blocked_until IS NOT NULL AND login_attempts.blocked_until > v_now);
END;
$$;

-- Periodic cleanup with explicit search_path
CREATE OR REPLACE FUNCTION cleanup_expired_login_attempts(
    p_older_than_seconds INT DEFAULT 86400
)
RETURNS INT LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
REVOKE EXECUTE ON FUNCTION record_login_attempt(TEXT, INT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION cleanup_expired_login_attempts(INT) FROM PUBLIC, anon, authenticated;

-- Grant execution strictly to service_role (backend service only)
GRANT EXECUTE ON FUNCTION record_login_attempt(TEXT, INT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_login_attempts(INT) TO service_role;
