import streamlit as st
import pandas as pd
from datetime import datetime

from src.pipelines.voice_pipeline import process_bulk_audio
from src.database.db import get_enrolled_students
from src.database.exceptions import DatabaseError
from src.components.dialog_attendance_results import show_attendance_result_fragment
from src.services.attendance import separate_voice_candidates, build_voice_attendance_results


@st.dialog('Voice Attendance')
def voice_attendance_dialog(selected_subject_id):
    # Reset voice attendance results when subject changes or dialog initializes
    if 'voice_subj_id' not in st.session_state or st.session_state.voice_subj_id != selected_subject_id:
        st.session_state.voice_attendance_results = None
        st.session_state.voice_subj_id = selected_subject_id

    st.write('Record audio of students saying "I am present". Then AI will recognize the students.')

    audio_data = st.audio_input("Record classroom audio")

    if st.button('Analyze Audio', width="stretch", type='primary'):
        if audio_data is None:
            st.warning('⚠️ Please record or upload an audio clip before taking attendance.')
            return

        with st.spinner('Processing audio data…'):
            try:
                enrolled_students = get_enrolled_students(selected_subject_id)
            except DatabaseError as e:
                st.error(f"Database error: {e}")
                return

            if not enrolled_students:
                st.warning('No students enrolled in this course')
                return

            candidates_dict, no_profile_ids = separate_voice_candidates(enrolled_students)

            if not candidates_dict and not no_profile_ids:
                st.error('No enrolled students found')
                return

            # Run voice analysis only on students that have profiles
            detected_scores = {}
            if candidates_dict:
                audio_bytes = audio_data.read()
                detected_scores = process_bulk_audio(audio_bytes, candidates_dict)

            current_timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            results, attendance_to_log = build_voice_attendance_results(
                enrolled_students, detected_scores, no_profile_ids,
                selected_subject_id, current_timestamp
            )

            # Clear active attendance log cache to prevent stale results / collision
            st.session_state.pop('active_attendance_logs', None)
            st.session_state.pop('active_attendance_df', None)
            st.session_state.voice_attendance_results = (pd.DataFrame(results), attendance_to_log)

    if st.session_state.get('voice_attendance_results'):
        st.divider()
        df_results, logs = st.session_state.voice_attendance_results

        # Show students without voice profiles separately
        no_profile_df = df_results[df_results['Status'] == "⚠️ No voice profile"]
        if not no_profile_df.empty:
            st.info(f"{len(no_profile_df)} student(s) have no voice profile and must be marked manually.")

        show_attendance_result_fragment(df_results, logs)
