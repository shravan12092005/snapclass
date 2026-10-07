import time

import numpy as np
import streamlit as st
from PIL import Image, ImageOps

from src.ui.base_layout import style_background_dashboard, style_base_layout
from src.components.header import header_dashboard
from src.components.footer import footer_dashboard
from src.pipelines.face_pipeline import predict_attendance, get_face_embeddings, train_classifier
from src.pipelines.voice_pipeline import get_voice_embedding
from src.database.db import (
    get_all_students,
    get_student_by_id,
    create_student,
    delete_student,
    get_student_dashboard_data,
    unenroll_student_to_subject,
)
from src.database.exceptions import DatabaseError, FacePipelineError
from src.components.dialog_enroll import enroll_dialog
from src.components.subject_card import subject_card
from src.services.auth_helpers import face_login_decision, check_duplicate_face
from src.services.records import compute_student_subject_stats

# ---------------------------------------------------------------------------
# Session cleanup helper
# ---------------------------------------------------------------------------

_STUDENT_SESSION_KEYS = [
    'student_data', 'temp_face_encoding', 'registration_face_encoding',
    'face_login_attempts', 'face_login_blocked_until',
    'pending_join_code', 'attendance_images',
    'active_attendance_logs', 'active_attendance_df',
    'voice_attendance_results', 'voice_subj_id',
]


def _clear_student_session():
    for key in _STUDENT_SESSION_KEYS:
        st.session_state.pop(key, None)
    st.session_state['is_logged_in'] = False


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def student_dashboard():
    student_data = st.session_state.student_data
    student_id = student_data['student_id']
    c1, c2 = st.columns(2, vertical_alignment='center', gap='large')
    with c1:
        header_dashboard()
    with c2:
        st.subheader(f"""Welcome, {student_data['name']} """)
        if st.button("Logout", type='secondary', key='student_logout_btn'):
            _clear_student_session()
            st.rerun()

    st.write("")

    c1, c2 = st.columns(2)
    with c1:
        st.header('Your Enrolled Subjects')
    with c2:
        if st.button('Enroll in Subject', type='primary', width="stretch"):
            enroll_dialog()

    st.divider()

    try:
        dashboard_data = get_student_dashboard_data(student_id)
    except DatabaseError as e:
        st.error(f"Could not load dashboard data: {e}")
        dashboard_data = []

    if not dashboard_data:
        st.info("You are not enrolled in any subjects yet. Click 'Enroll in Subject' above to get started!")

    subject_stats = compute_student_subject_stats(dashboard_data)

    cols = st.columns(2)
    for i, stat in enumerate(subject_stats):
        sid = stat['subject_id']
        stats = {"total": stat['total'], "attended": stat['attended']}
        percentage = stat['percentage']

        # Look up the original node for nested sub info (section, code)
        node = dashboard_data[i]
        sub = node['subjects']

        def unenroll_button(s=sid, sn=sub['name']):
            if st.button("Unenroll from this course", type='tertiary', width="stretch", icon=':material/delete_forever:', key=f"unenroll_{s}"):
                try:
                    unenroll_student_to_subject(student_id, s)
                    st.toast(f'Unenrolled from {sn} successfully!')
                    st.rerun()
                except DatabaseError as e:
                    st.error(f"Failed to unenroll: {e}")

        with cols[i % 2]:
            subject_card(
                name=sub['name'],
                code=sub['subject_code'],
                section=sub['section'],
                stats=[
                    ('📅', 'Total', stats['total']),
                    ('✅', 'Attended', stats['attended']),
                    ('📈', 'Rate', f"{percentage:.1f}%"),
                ]
            )
            # Render a custom progress bar to visually represent the attendance rate
            st.progress(percentage / 100.0)
            unenroll_button(sid, sub['name'])
            st.write("")

    # --- Delete profile button ---
    st.divider()
    with st.expander("⚠️ Danger Zone"):
        st.warning("Deleting your profile will permanently remove your face/voice data, enrollments, and attendance records.")
        if st.button("🗑️ Delete my profile and data", type="secondary"):
            try:
                delete_student(student_id)
                st.toast("Profile deleted.")
                _clear_student_session()
                train_classifier()
                time.sleep(1)
                st.rerun()
            except DatabaseError as e:
                st.error(f"Failed to delete profile: {e}")

    footer_dashboard()


# ---------------------------------------------------------------------------
# Student screen entry
# ---------------------------------------------------------------------------

def student_screen():
    style_background_dashboard()
    style_base_layout()

    if "student_data" in st.session_state:
        student_dashboard()
        return

    # Initialize rate-limit variables
    if 'face_login_attempts' not in st.session_state:
        st.session_state.face_login_attempts = 0
    if 'face_login_blocked_until' not in st.session_state:
        st.session_state.face_login_blocked_until = 0.0

    c1, c2 = st.columns(2, vertical_alignment='center', gap='large')
    with c1:
        header_dashboard()
    with c2:
        if st.button("Go back to Home", type='secondary', key='student_back_btn'):
            st.session_state['login_type'] = None
            st.session_state.pop('registration_face_encoding', None)
            st.session_state.pop('temp_face_encoding', None)
            st.rerun()

    # Lockout check
    current_time = time.time()
    if current_time < st.session_state.face_login_blocked_until:
        remaining_seconds = int(st.session_state.face_login_blocked_until - current_time)
        st.error(f"🔒 Too many failed login attempts. Locked out for {remaining_seconds} seconds.")
        footer_dashboard()
        return

    st.markdown("<h2 style='text-align: center; color: #000000;'>Login using FaceID</h2>", unsafe_allow_html=True)
    st.write("")
    st.write("")

    show_registration = "registration_face_encoding" in st.session_state

    photo_source = st.camera_input("Position your face in the center")

    if photo_source and not show_registration:
        img = ImageOps.exif_transpose(Image.open(photo_source))
        img_np = np.array(img.convert('RGB'))

        with st.spinner('AI is scanning..'):
            try:
                detected, all_ids, num_faces = predict_attendance(img_np, login_mode=True)
            except FacePipelineError:
                st.error("Face recognition service error. Please try again.")
                detected, all_ids, num_faces = {}, [], 0
            decision = face_login_decision(detected, num_faces)

            if decision[0] == "no_face":
                st.warning('Face not found!')
            elif decision[0] == "multi_face":
                st.warning('Multiple faces found')
            elif decision[0] == "recognized":
                student_id = decision[1]
                try:
                    student = get_student_by_id(student_id)
                except DatabaseError:
                    student = None

                if student:
                    st.session_state.is_logged_in = True
                    st.session_state.user_role = 'student'
                    st.session_state.student_data = student
                    st.session_state.face_login_attempts = 0  # reset attempts on success
                    st.session_state.pop('temp_face_encoding', None)
                    st.toast(f'Welcome Back {student["name"]}')
                    time.sleep(1)
                    st.rerun()
            elif decision[0] == "not_recognized":
                st.session_state.face_login_attempts += 1
                if st.session_state.face_login_attempts >= 5:
                    st.session_state.face_login_blocked_until = time.time() + 60  # lock for 60 seconds
                    st.session_state.face_login_attempts = 0
                    st.session_state.pop('temp_face_encoding', None)
                    st.error("🔒 Too many failed attempts. Lockout triggered for 60 seconds.")
                    time.sleep(1)
                    st.rerun()
                else:
                    st.warning(f'Face not recognized! (Attempt {st.session_state.face_login_attempts}/5)')
                    try:
                        encodings = get_face_embeddings(img_np)
                    except FacePipelineError:
                        encodings = []
                    if encodings:
                        st.session_state.temp_face_encoding = encodings[0].tolist()
                    else:
                        st.error('Could not capture your facial features. Please try again.')

    if 'temp_face_encoding' in st.session_state and not show_registration:
        st.write("If you are a new student, click below to register a profile using the scanned face:")
        if st.button("Register New Profile", type="primary", key="register_new_profile_btn"):
            st.session_state.registration_face_encoding = st.session_state.pop('temp_face_encoding')
            st.rerun()

    if show_registration:
        with st.container(border=True):
            st.header('Register new Profile')
            new_name = st.text_input("Enter your name", placeholder='E.g. Shravan Mole')

            st.subheader('Optional : Voice Enrollment')
            st.info("Enroll your voice for voice-only attendance verification")

            audio_data = None
            try:
                audio_data = st.audio_input('Record a short phrase like "I am present, my name is Akash."')
            except Exception:
                st.error('Audio recording input failed!')

            # Consent checkbox before storing biometric data
            consent = st.checkbox(
                "I consent to storing my face and voice biometric data for attendance purposes.",
                key="biometric_consent_cb"
            )

            c_btn1, c_btn2 = st.columns(2)
            with c_btn1:
                if st.button('Create Account', type='primary', width="stretch"):
                    if not consent:
                        st.warning("You must consent to biometric data storage before creating an account.")
                    elif new_name:
                        face_emb = st.session_state.get('registration_face_encoding')
                        if face_emb:
                            with st.spinner('Creating profile..'):
                                # Prevent duplicates by validating face similarity
                                try:
                                    all_students = get_all_students()
                                except DatabaseError as e:
                                    st.error(f"Database error: {e}")
                                    all_students = None

                                if all_students is not None:
                                    duplicate_student = check_duplicate_face(face_emb, all_students)

                                    if duplicate_student:
                                        st.error(f"❌ Registration failed: A student matching this face is already registered (Name: {duplicate_student['name']}). Please log in instead.")
                                    else:
                                        voice_emb = None
                                        if audio_data:
                                            voice_emb = get_voice_embedding(audio_data.read())

                                        try:
                                            response_data = create_student(new_name, face_embedding=face_emb, voice_embedding=voice_emb)
                                        except DatabaseError as e:
                                            st.error(f"Failed to create profile: {e}")
                                            response_data = None

                                        if response_data:
                                            train_classifier()
                                            st.session_state.is_logged_in = True
                                            st.session_state.user_role = 'student'
                                            st.session_state.student_data = response_data[0]
                                            st.session_state.pop('registration_face_encoding', None)
                                            st.toast(f'Profile Created! Hi {new_name}!')
                                            time.sleep(1)
                                            st.rerun()
                        else:
                            st.error('Could not capture face features. Please retake photo.')
                    else:
                        st.warning('Please enter your name!')

            with c_btn2:
                if st.button('Retake Photo', type='secondary', width="stretch"):
                    st.session_state.pop('registration_face_encoding', None)
                    st.rerun()

    footer_dashboard()