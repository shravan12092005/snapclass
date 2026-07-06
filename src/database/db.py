from src.database.config import supabase
import bcrypt
import streamlit as st
import traceback
from src.utils.logger import logger

def hash_pass(pwd):
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()

def check_pass(pwd, hashed):
    return bcrypt.checkpw(pwd.encode(), hashed.encode())

def safe_execute(query):
    try:
        return query.execute()
    except Exception as e:
        st.error(f"Database operation failed: {str(e)}")
        logger.error(f"Database Exception details:\n{traceback.format_exc()}")
        class DummyResponse:
            def __init__(self):
                self.data = []
        return DummyResponse()


def check_teacher_exists(username):
    # Check for unique username, returns false when username is already taken
    response = safe_execute(supabase.table("teachers").select("username").eq("username", username))
    return len(response.data) > 0 



def create_teacher(username, password, name):

    data = { "username" : username, "password": hash_pass(password), "name": name}
    response = safe_execute(supabase.table("teachers").insert(data))
    return response.data


def teacher_login(username, password):
    response = safe_execute(supabase.table("teachers").select("*").eq("username", username))
    if response.data:
        teacher = response.data[0]
        if check_pass(password, teacher['password']):
            return teacher
    return None


def get_all_students():
    response = safe_execute(supabase.table('students').select("*"))
    return response.data

def create_student(new_name, face_embedding=None, voice_embedding=None):
    data = {'name': new_name, 'face_embedding':face_embedding, "voice_embedding": voice_embedding}
    response = safe_execute(supabase.table('students').insert(data))
    return response.data


def create_subject(subject_code, name, section, teacher_id):
    data = {"subject_code": subject_code, "name": name, "section": section, "teacher_id": teacher_id}
    response = safe_execute(supabase.table("subjects").insert(data))
    return response.data

def get_teacher_subjects(teacher_id):
    response = safe_execute(supabase.table('subjects').select("*, subject_students(count), attendance_logs(timestamp)").eq("teacher_id", teacher_id))
    subjects = response.data


    for sub in subjects:
        sub['total_students'] = sub.get("subject_students", [{}])[0].get('count', 0) if sub.get('subject_students') else 0
        attendance = sub.get('attendance_logs', [])
        unique_sessions = len(set(log['timestamp'] for log in attendance))
        sub['total_classes'] = unique_sessions


        sub.pop('subject_students', None)
        sub.pop('attendance_logs', None)

    return subjects


def  enroll_student_to_subject(student_id, subject_id):
    data = {'student_id': student_id, "subject_id": subject_id}
    response= safe_execute(supabase.table('subject_students').insert(data))
    return response.data


def  unenroll_student_to_subject(student_id, subject_id):
    response= safe_execute(supabase.table('subject_students').delete().eq('student_id', student_id).eq('subject_id', subject_id))
    return response.data



def get_student_subjects(student_id):
    response = safe_execute(supabase.table('subject_students').select('*, subjects(*)').eq('student_id', student_id))
    return response.data


def get_student_attendance(student_id):
    response = safe_execute(supabase.table('attendance_logs').select('*, subjects(*)').eq('student_id', student_id))
    return response.data


def create_attendance(logs):
    response = safe_execute(supabase.table('attendance_logs').insert(logs))
    return response.data

def get_attendance_for_teacher(teacher_id):
    response = safe_execute(supabase.table('attendance_logs').select("*, subjects!inner(*)").eq('subjects.teacher_id', teacher_id))
    return response.data


def delete_subject(subject_id):
    # 1. Delete all attendance logs for this subject
    safe_execute(supabase.table("attendance_logs").delete().eq("subject_id", subject_id))
    # 2. Delete all student enrollments for this subject
    safe_execute(supabase.table("subject_students").delete().eq("subject_id", subject_id))
    # 3. Delete the subject itself
    response = safe_execute(supabase.table("subjects").delete().eq("subject_id", subject_id))
    return response.data

def get_student_dashboard_data(student_id):
    response = safe_execute(
        supabase.table('subject_students')
        .select('*, subjects(*, attendance_logs(*))')
        .eq('student_id', student_id)
        .eq('subjects.attendance_logs.student_id', student_id)
    )
    return response.data