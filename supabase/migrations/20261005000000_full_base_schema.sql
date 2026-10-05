-- ==========================================================================
-- Full base schema for SnapClass (idempotent).
-- Tables: teachers, students, subjects, subject_students, attendance_logs
-- Uses ON DELETE CASCADE so that delete_subject is a single DELETE.
-- ==========================================================================

-- 1. Teachers
CREATE TABLE IF NOT EXISTS teachers (
    teacher_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username    TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    name        TEXT NOT NULL
);

-- 2. Students
CREATE TABLE IF NOT EXISTS students (
    student_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT NOT NULL,
    face_embedding  JSONB,
    voice_embedding JSONB,
    roll_number     TEXT
);

-- 3. Subjects
CREATE TABLE IF NOT EXISTS subjects (
    subject_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subject_code TEXT NOT NULL,
    name         TEXT NOT NULL,
    section      TEXT NOT NULL DEFAULT 'A',
    teacher_id   BIGINT NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE
);

-- Ensure subject_code is unique (idempotent via IF NOT EXISTS)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subjects_subject_code_unique'
    ) THEN
        ALTER TABLE subjects ADD CONSTRAINT subjects_subject_code_unique UNIQUE (subject_code);
    END IF;
END $$;

-- 4. Subject ↔ Student enrollment (many-to-many)
CREATE TABLE IF NOT EXISTS subject_students (
    student_id  BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    subject_id  BIGINT NOT NULL REFERENCES subjects(subject_id)  ON DELETE CASCADE,
    PRIMARY KEY (student_id, subject_id)
);

-- 5. Attendance logs
CREATE TABLE IF NOT EXISTS attendance_logs (
    log_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id  BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    subject_id  BIGINT NOT NULL REFERENCES subjects(subject_id)  ON DELETE CASCADE,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_present  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_attendance_logs_subject_ts
    ON attendance_logs (subject_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_student
    ON attendance_logs (student_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
-- Enable RLS on every table.  No policies for `anon` — only the
-- service-role key can access the tables.
-- ---------------------------------------------------------------------------

ALTER TABLE teachers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs  ENABLE ROW LEVEL SECURITY;

-- Service-role key bypasses RLS automatically.
-- Drop any permissive anon/authenticated policies that may exist from
-- earlier migrations so anon has NO access.

DO $$ DECLARE _pol RECORD; BEGIN
    FOR _pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (policyname ILIKE '%anon%' OR policyname ILIKE '%public%' OR policyname ILIKE '%authenticated%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', _pol.policyname, _pol.tablename);
    END LOOP;
END $$;
