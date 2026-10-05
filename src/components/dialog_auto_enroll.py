import time

import streamlit as st

from src.database.db import enroll_student_to_subject, lookup_subject_by_code, check_enrollment
from src.database.exceptions import DatabaseError


@st.dialog("Quick Enrollment")
def auto_enroll_dialog(subject_code):
    student_id = st.session_state.student_data['student_id']

    try:
        subject = lookup_subject_by_code(subject_code)
    except DatabaseError as e:
        st.error(f"Database error: {e}")
        if st.button('Close'):
            st.query_params.clear()
            st.rerun()
        return

    if subject is None:
        st.error('Subject code not found!')
        if st.button('Close'):
            st.query_params.clear()
            st.rerun()
        return

    try:
        already_enrolled = check_enrollment(student_id, subject['subject_id'])
    except DatabaseError as e:
        st.error(f"Database error: {e}")
        if st.button('Close'):
            st.query_params.clear()
            st.rerun()
        return

    if already_enrolled:
        st.info("You're already enrolled!")
        if st.button('Got it!'):
            st.query_params.clear()
            st.rerun()
        return

    st.markdown(f"Would you like to enroll in **{subject['name']}**?")

    col1, col2 = st.columns(2)

    with col1:
        if st.button('No thanks'):
            st.query_params.clear()
            st.rerun()
    with col2:
        if st.button('Yes enroll now!', type='primary', width="stretch"):
            try:
                enroll_student_to_subject(student_id, subject['subject_id'])
                st.success('Joined successfully!')
                st.query_params.clear()
                time.sleep(2)
                st.rerun()
            except DatabaseError as e:
                st.error(f"Failed to enroll: {e}")
