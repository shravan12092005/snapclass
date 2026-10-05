import time

import streamlit as st

from src.database.db import enroll_student_to_subject, lookup_subject_by_code, check_enrollment
from src.database.exceptions import DatabaseError


@st.dialog("Enroll in Subject")
def enroll_dialog():
    st.write('Enter the subject code provided by your teacher to enroll')
    join_code = st.text_input('Subject Code', placeholder='Eg. CS101')

    if st.button('Enroll now', type='primary', width="stretch"):
        if not join_code or not join_code.strip():
            st.warning('Please enter a subject code')
            return

        try:
            subject = lookup_subject_by_code(join_code.strip())
        except DatabaseError as e:
            st.error(f"Database error: {e}")
            return

        if subject is None:
            st.error('Subject code not found. Please check and try again.')
            return

        student_id = st.session_state.student_data['student_id']

        try:
            already_enrolled = check_enrollment(student_id, subject['subject_id'])
        except DatabaseError as e:
            st.error(f"Database error: {e}")
            return

        if already_enrolled:
            st.warning('You are already enrolled in this program')
            return

        try:
            enroll_student_to_subject(student_id, subject['subject_id'])
            st.success('Successfully enrolled!')
            time.sleep(1)
            st.rerun()
        except DatabaseError as e:
            st.error(f"Failed to enroll: {e}")