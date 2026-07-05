import streamlit as st
from src.database.db import delete_subject

@st.dialog("Delete Subject?")
def delete_subject_dialog(subject_name, subject_id):
    st.write(f"Are you sure you want to permanently delete **{subject_name}**?")
    st.warning("⚠️ This action is permanent and cannot be undone. Deleting this subject will also remove all associated student enrollments and attendance records.")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Cancel", width="stretch"):
            st.rerun()

    with col2:
        if st.button("Delete Subject", type="secondary", width="stretch"):
            try:
                delete_subject(subject_id)
                st.toast(f"✅ Deleted subject: {subject_name}", icon="🗑️")
                import time
                time.sleep(1)
                st.rerun()
            except Exception as e:
                st.error(f"Failed to delete subject: {str(e)}")
