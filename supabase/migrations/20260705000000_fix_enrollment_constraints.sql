-- 1. Drop the incorrect UNIQUE constraint on subject_id if it exists
-- This was preventing multiple students from enrolling in the same course.
ALTER TABLE subject_students DROP CONSTRAINT IF EXISTS subject_students_subject_id_key;
ALTER TABLE subject_students DROP CONSTRAINT IF EXISTS subject_students_subject_id_uniq;

-- 2. Drop the existing primary key constraint if it was solely subject_id
ALTER TABLE subject_students DROP CONSTRAINT IF EXISTS subject_students_pkey;

-- 3. Define a proper composite primary key (student_id, subject_id)
-- This allows multiple students per subject, and multiple subjects per student,
-- while preventing the same student from enrolling in the same subject twice.
ALTER TABLE subject_students ADD PRIMARY KEY (student_id, subject_id);

-- 4. Enable Row Level Security (RLS) on subject_students
ALTER TABLE subject_students ENABLE ROW LEVEL SECURITY;

-- 5. Drop any conflicting policies to prevent duplicate/overlapping definition errors
DROP POLICY IF EXISTS "Allow public select on subject_students" ON subject_students;
DROP POLICY IF EXISTS "Allow public insert on subject_students" ON subject_students;
DROP POLICY IF EXISTS "Allow public delete on subject_students" ON subject_students;

-- 6. Create RLS Policies to allow students and teachers to enroll, view, and unenroll
CREATE POLICY "Allow public select on subject_students"
ON subject_students
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert on subject_students"
ON subject_students
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public delete on subject_students"
ON subject_students
FOR DELETE
TO anon, authenticated
USING (true);
