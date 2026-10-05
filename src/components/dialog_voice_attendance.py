import streamlit as st
import pandas as pd
from datetime import datetime

from src.pipelines.voice_pipeline import process_bulk_audio
from src.database.db import safe_execute
from src.database.config import supabase
from src.database.exceptions import DatabaseError
from src.components.dialog_attendance_results import show_attendance_result_fragment


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
                enrolled_res = safe_execute(
                    supabase.table('subject_students')
                    .select("*, students(*)")
                    .eq('subject_id', selected_subject_id)
                )
            except DatabaseError as e:
                st.error(f"Database error: {e}")
                return

            enrolled_students = enrolled_res.data

            if not enrolled_students:
                st.warning('No students enrolled in this course')
                return

            # Separate students with and without voice profiles
            candidates_dict = {}
            no_profile_ids = set()
            for s in enrolled_students:
                student = s['students']
                if student.get('voice_embedding'):
                    candidates_dict[student['student_id']] = student['voice_embedding']
                else:
                    no_profile_ids.add(student['student_id'])

            if not candidates_dict and not no_profile_ids:
                st.error('No enrolled students found')
                return

            # Run voice analysis only on students that have profiles
            detected_scores = {}
            if candidates_dict:
                audio_bytes = audio_data.read()
                detected_scores = process_bulk_audio(audio_bytes, candidates_dict)

            results, attendance_to_log = [], []
            current_timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

            for node in enrolled_students:
                student = node['students']
                sid = student['student_id']

                if sid in no_profile_ids:
                    # No voice profile — show as "No voice profile", don't count as absent
                    status_label = "⚠️ No voice profile"
                    is_present = False
                    source_val = "N/A"
                else:
                    score = detected_scores.get(sid, 0.0)
                    is_present = sid in detected_scores
                    status_label = "✅ Present" if is_present else "❌ Absent"
                    source_val = score if is_present else "-"

                results.append({
                    "Name": student['name'],
                    "ID": sid,
                    "Source": source_val,
                    "Status": status_label
                })

                # Students without profiles are excluded from the log
                # so they aren't counted as absent by the AI
                if sid not in no_profile_ids:
                    attendance_to_log.append({
                        'student_id': sid,
                        'subject_id': selected_subject_id,
                        'timestamp': current_timestamp,
                        'is_present': bool(is_present)
                    })

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
