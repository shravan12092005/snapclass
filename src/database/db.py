import traceback

import bcrypt
import streamlit as st

from src.database.config import supabase
from src.database.exceptions import DatabaseError
from src.utils.logger import logger


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def hash_pass(pwd):
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()

def check_pass(pwd, hashed):
    return bcrypt.checkpw(pwd.encode(), hashed.encode())


def safe_execute(query):
    """Execute a Supabase query, raising ``DatabaseError`` on failure.

    No ``st.error`` is called here — callers in the UI layer are
    responsible for catching ``DatabaseError`` and displaying messages.
    """
    try:
        return query.execute()
    except Exception as e:
        logger.error(f"Database Exception details:\n{traceback.format_exc()}")
        raise DatabaseError(str(e)) from e


def fetch_all_pages(query_builder, page_size=1000):
    """Page through Supabase query results using .range() to avoid the 1,000-row cap."""
    all_data = []
    start = 0
    while True:
        end = start + page_size - 1
        paged_query = query_builder.range(start, end)
        res = safe_execute(paged_query)
        data = res.data if res and res.data is not None else []
        all_data.extend(data)
        if len(data) < page_size:
            break
        start += page_size
    return all_data


# ---------------------------------------------------------------------------
# Teachers
# ---------------------------------------------------------------------------

def check_teacher_exists(username):
    """Return True when *username* is already taken.

    Raises ``DatabaseError`` when the DB is unreachable.
    """
    response = safe_execute(
        supabase.table("teachers").select("username").eq("username", username)
    )
    return len(response.data) > 0


def create_teacher(username, password, name):
    data = {"username": username, "password": hash_pass(password), "name": name}
    response = safe_execute(supabase.table("teachers").insert(data))
    return response.data


def teacher_login(username, password):
    """Return the teacher record on success, else ``None``.

    Raises ``DatabaseError`` if the DB query itself fails.
    """
    response = safe_execute(
        supabase.table("teachers").select("*").eq("username", username)
    )
    if response.data:
        teacher = response.data[0]
        if check_pass(password, teacher['password']):
            return teacher
    return None


# ---------------------------------------------------------------------------
# Students
# ---------------------------------------------------------------------------

def get_all_students():
    return fetch_all_pages(supabase.table('students').select("*"))


def get_student_by_id(student_id):
    """Fetch a single student by primary key. Returns the dict or ``None``."""
    response = safe_execute(
        supabase.table('students').select("*").eq("student_id", student_id)
    )
    return response.data[0] if response.data else None


def create_student(new_name, face_embedding=None, voice_embedding=None):
    data = {'name': new_name, 'face_embedding': face_embedding, "voice_embedding": voice_embedding}
    response = safe_execute(supabase.table('students').insert(data))
    return response.data


def delete_student(student_id):
    """Delete a student row.  ON DELETE CASCADE handles related rows."""
    response = safe_execute(
        supabase.table("students").delete().eq("student_id", student_id)
    )
    return response.data


# ---------------------------------------------------------------------------
# Subjects
# ---------------------------------------------------------------------------

def create_subject(subject_code, name, section, teacher_id):
    data = {"subject_code": subject_code, "name": name, "section": section, "teacher_id": teacher_id}
    response = safe_execute(supabase.table("subjects").insert(data))
    try:
        get_teacher_subjects.clear()
    except Exception:
        pass
    return response.data


@st.cache_data(ttl=30)
def get_teacher_subjects(teacher_id):
    response = safe_execute(
        supabase.table('subjects')
        .select("*, subject_students(count), attendance_logs(timestamp)")
        .eq("teacher_id", teacher_id)
    )
    subjects = response.data

    for sub in subjects:
        sub['total_students'] = sub.get("subject_students", [{}])[0].get('count', 0) if sub.get('subject_students') else 0
        attendance = sub.get('attendance_logs', [])
        unique_sessions = len(set(log['timestamp'] for log in attendance))
        sub['total_classes'] = unique_sessions

        sub.pop('subject_students', None)
        sub.pop('attendance_logs', None)

    return subjects


def lookup_subject_by_code(subject_code):
    """Case-insensitive lookup of a subject by its code.

    Returns the subject dict or ``None``.
    """
    response = safe_execute(
        supabase.table('subjects')
        .select('subject_id, name, subject_code')
        .ilike('subject_code', subject_code.strip())
    )
    if not response.data:
        return None
    if len(response.data) > 1:
        # Ambiguous match — refuse rather than guess
        return None
    return response.data[0]


# ---------------------------------------------------------------------------
# Enrollment
# ---------------------------------------------------------------------------

def enroll_student_to_subject(student_id, subject_id):
    data = {'student_id': student_id, "subject_id": subject_id}
    response = safe_execute(supabase.table('subject_students').insert(data))
    return response.data


def unenroll_student_to_subject(student_id, subject_id):
    response = safe_execute(
        supabase.table('subject_students').delete()
        .eq('student_id', student_id)
        .eq('subject_id', subject_id)
    )
    return response.data


def check_enrollment(student_id, subject_id):
    """Return True if the student is already enrolled in the subject."""
    response = safe_execute(
        supabase.table('subject_students').select('student_id')
        .eq('subject_id', subject_id)
        .eq('student_id', student_id)
    )
    return bool(response.data)


def get_student_subjects(student_id):
    response = safe_execute(
        supabase.table('subject_students').select('*, subjects(*)').eq('student_id', student_id)
    )
    return response.data


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

def get_student_attendance(student_id):
    response = safe_execute(
        supabase.table('attendance_logs').select('*, subjects(*)').eq('student_id', student_id)
    )
    return response.data


def create_attendance(logs):
    response = safe_execute(supabase.table('attendance_logs').insert(logs))
    return response.data


def get_attendance_for_teacher(teacher_id):
    query = (
        supabase.table('attendance_logs')
        .select("*, subjects!inner(*)")
        .eq('subjects.teacher_id', teacher_id)
    )
    return fetch_all_pages(query)


# ---------------------------------------------------------------------------
# Subject deletion (cascade via FK — single DELETE)
# ---------------------------------------------------------------------------

def delete_subject(subject_id):
    """Delete a subject.  ON DELETE CASCADE removes enrollments and logs."""
    response = safe_execute(
        supabase.table("subjects").delete().eq("subject_id", subject_id)
    )
    try:
        get_teacher_subjects.clear()
    except Exception:
        pass
    return response.data


# ---------------------------------------------------------------------------
# Dashboard aggregation
# ---------------------------------------------------------------------------

def get_student_dashboard_data(student_id):
    response = safe_execute(
        supabase.table('subject_students')
        .select('*, subjects(*, attendance_logs(*))')
        .eq('student_id', student_id)
        .eq('subjects.attendance_logs.student_id', student_id)
    )
    return response.data


def get_enrolled_students(subject_id):
    """Fetch enrolled students with their student profiles for a subject."""
    query = (
        supabase.table('subject_students')
        .select("*, students(*)")
        .eq('subject_id', subject_id)
    )
    return fetch_all_pages(query)


def get_subject_attendance_logs(subject_id):
    """Fetch attendance log entries (student_id, is_present) for a subject."""
    query = (
        supabase.table('attendance_logs')
        .select('student_id, is_present')
        .eq('subject_id', subject_id)
    )
    return fetch_all_pages(query)