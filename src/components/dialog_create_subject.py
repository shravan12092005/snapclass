import random
import string

import streamlit as st

from src.database.db import create_subject, lookup_subject_by_code
from src.database.exceptions import DatabaseError


def _generate_subject_code(length=7):
    """Generate a random 6-8 char uppercase alphanumeric code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def _generate_unique_code(max_retries=10):
    """Generate a code that doesn't collide with existing subjects."""
    for _ in range(max_retries):
        code = _generate_subject_code()
        try:
            existing = lookup_subject_by_code(code)
        except DatabaseError:
            # Can't verify uniqueness — return the code anyway; the DB
            # UNIQUE constraint will catch any collision on insert.
            return code
        if existing is None:
            return code
    # Extremely unlikely — fall back to a longer code
    return _generate_subject_code(length=8)


@st.dialog("Create New Subject")
def create_subject_dialog(teacher_id):
    st.write("Enter the details of new subject")
    sub_name = st.text_input("Subject Name", placeholder="Introduction to Computer Science")
    sub_section = st.text_input("Section", placeholder="A")

    st.caption("A unique subject code will be generated automatically.")

    if st.button("Create Subject Now", type='primary', width="stretch"):
        if sub_name and sub_section:
            try:
                sub_code = _generate_unique_code()
                create_subject(sub_code, sub_name, sub_section, teacher_id)
                st.toast(f"Subject created with code **{sub_code}**!")
                st.rerun()
            except DatabaseError as e:
                st.error(f"Failed to create subject: {e}")
        else:
            st.warning("Please fill all the fields")
