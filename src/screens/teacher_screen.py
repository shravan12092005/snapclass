import io
import time
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import streamlit as st

from src.ui.base_layout import style_background_dashboard, style_base_layout
from src.components.header import header_dashboard
from src.components.footer import footer_dashboard
from src.components.subject_card import subject_card
from src.database.db import (
    check_teacher_exists,
    create_teacher,
    teacher_login,
    get_teacher_subjects,
    get_attendance_for_teacher,
    safe_execute,
    unenroll_student_to_subject,
)
from src.database.config import supabase
from src.database.exceptions import DatabaseError
from src.components.dialog_create_subject import create_subject_dialog
from src.components.dialog_share_subject import share_subject_dialog
from src.components.dialog_add_photo import add_photos_dialog
from src.components.dialog_delete_subject import delete_subject_dialog
from src.pipelines.face_pipeline import predict_attendance
from src.components.dialog_attendance_results import attendance_result_dialog
from src.components.dialog_voice_attendance import voice_attendance_dialog
from src.services.attendance import build_face_attendance_results
from src.services.roster import compute_roster_data
from src.services.auth_helpers import validate_registration_fields, validate_password


# ---------------------------------------------------------------------------
# Session cleanup helper
# ---------------------------------------------------------------------------

_TEACHER_SESSION_KEYS = [
    'teacher_data', 'current_teacher_tab', 'attendance_images',
    'active_attendance_logs', 'active_attendance_df',
    'voice_attendance_results', 'voice_subj_id',
    'prev_selected_subject_id', 'photo_tab',
    'pending_join_code',
]


def _clear_teacher_session():
    for key in _TEACHER_SESSION_KEYS:
        st.session_state.pop(key, None)
    st.session_state['is_logged_in'] = False


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def teacher_screen():

    style_background_dashboard()
    style_base_layout()

    if "teacher_data" in st.session_state:
        teacher_dashboard()
    elif 'teacher_login_type' not in st.session_state or st.session_state.teacher_login_type == "login":
        teacher_screen_login()
    elif st.session_state.teacher_login_type == "register":
        teacher_screen_register()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def teacher_dashboard():
    teacher_data = st.session_state.teacher_data
    c1, c2 = st.columns(2, vertical_alignment='center', gap='large')
    with c1:
        header_dashboard()
    with c2:
        st.subheader(f"""Welcome, {teacher_data['name']} """)
        if st.button("Logout", type='secondary', key='teacher_logout_btn'):
            _clear_teacher_session()
            st.rerun()

    st.write("")

    if "current_teacher_tab" not in st.session_state:
        st.session_state.current_teacher_tab = 'take_attendance'
    tab1, tab2, tab3 = st.columns(3)

    with tab1:
        type1 = "primary" if st.session_state.current_teacher_tab == 'take_attendance' else "tertiary"
        if st.button('Take Attendance', type=type1, width="stretch", icon=':material/ar_on_you:'):
            st.session_state.current_teacher_tab = 'take_attendance'
            st.rerun()

    with tab2:
        type2 = "primary" if st.session_state.current_teacher_tab == 'manage_subjects' else "tertiary"
        if st.button('Manage Subjects', type=type2, width="stretch", icon=':material/book_ribbon:'):
            st.session_state.current_teacher_tab = 'manage_subjects'
            st.rerun()

    with tab3:
        type3 = "primary" if st.session_state.current_teacher_tab == 'attendance_records' else "tertiary"
        if st.button('Attendance Records', type=type3, width="stretch", icon=':material/table_chart:'):
            st.session_state.current_teacher_tab = 'attendance_records'
            st.rerun()

    st.divider()

    if st.session_state.current_teacher_tab == "take_attendance":
        teacher_tab_take_attendance()
    if st.session_state.current_teacher_tab == "manage_subjects":
        teacher_tab_manage_subjects()
    if st.session_state.current_teacher_tab == "attendance_records":
        teacher_tab_attendance_records()

    footer_dashboard()


# ---------------------------------------------------------------------------
# Take Attendance tab
# ---------------------------------------------------------------------------

def teacher_tab_take_attendance():
    teacher_id = st.session_state.teacher_data['teacher_id']
    st.header('Take AI Attendance')

    if 'attendance_images' not in st.session_state:
        st.session_state.attendance_images = []

    try:
        subjects = get_teacher_subjects(teacher_id)
    except DatabaseError as e:
        st.error(f"Could not load subjects: {e}")
        return

    if not subjects:
        st.warning('You havent created any subjects yet! Please create one to begin!')
        return

    subject_options = {f"{s['name']} - {s['subject_code']}": s['subject_id'] for s in subjects}

    col1, col2 = st.columns([3, 1], vertical_alignment='bottom')

    with col1:
        selected_subject_label = st.selectbox('Select Subject', options=list(subject_options.keys()))

    with col2:
        if st.button('Add Photos', type='primary', icon=':material/photo_prints:', width="stretch"):
            add_photos_dialog()

    selected_subject_id = subject_options[selected_subject_label]

    # Automatically clear staged images when the subject changes to prevent carry-over
    if 'prev_selected_subject_id' not in st.session_state:
        st.session_state.prev_selected_subject_id = selected_subject_id
    elif st.session_state.prev_selected_subject_id != selected_subject_id:
        st.session_state.attendance_images = []
        st.session_state.prev_selected_subject_id = selected_subject_id

    st.divider()

    if st.session_state.attendance_images:
        st.header('Added Photos')
        gallery_cols = st.columns(4)

        for idx, img in enumerate(st.session_state.attendance_images):
            with gallery_cols[idx % 4]:
                st.image(img, use_container_width=True, caption=f'Photo {idx+1}')
    has_photos = bool(st.session_state.attendance_images)
    c1, c2, c3 = st.columns(3)

    with c1:
        if st.button('Clear all photos', width="stretch", type='tertiary', icon=':material/delete:', disabled=not has_photos):
            st.session_state.attendance_images = []
            st.rerun()

    with c2:
        if st.button('Run Face Analysis', width="stretch", type='secondary', icon=':material/analytics:', disabled=not has_photos):
            with st.spinner('Deep scanning classroom photos...'):
                try:
                    enrolled_res = safe_execute(
                        supabase.table('subject_students')
                        .select("*, students(*)")
                        .eq('subject_id', selected_subject_id)
                    )
                except DatabaseError as e:
                    st.error(f"Could not load enrolled students: {e}")
                    return

                enrolled_students = enrolled_res.data

                if not enrolled_students:
                    st.warning('No students enrolled in this course')
                    return

                candidate_ids = {
                    node['students']['student_id']
                    for node in enrolled_students
                    if node.get('students') and node['students'].get('student_id') is not None
                }

                all_detected_ids = {}

                for idx, img in enumerate(st.session_state.attendance_images):
                    img_np = np.array(img.convert('RGB'))
                    detected, _, _ = predict_attendance(img_np, candidate_ids=candidate_ids)

                    if detected:
                        for sid in detected.keys():
                            student_id = int(sid)
                            all_detected_ids.setdefault(student_id, []).append(f"Photo {idx+1}")

                # Clear active attendance log cache to prevent stale results / collision
                    st.session_state.pop('active_attendance_logs', None)
                    st.session_state.pop('active_attendance_df', None)

                    current_timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                    results, attendance_to_log = build_face_attendance_results(
                        enrolled_students, all_detected_ids, selected_subject_id, current_timestamp
                    )

                    # Store results in session_state and reopen via flag
                    st.session_state['face_attendance_pending'] = (pd.DataFrame(results), attendance_to_log)

        # Reopen dialog from session flag (survives reruns)
        if st.session_state.get('face_attendance_pending'):
            df_res, logs_res = st.session_state.pop('face_attendance_pending')
            attendance_result_dialog(df_res, logs_res)

    with c3:
        if st.button('Use Voice Attendance', type='primary', width="stretch", icon=':material/mic:'):
            voice_attendance_dialog(selected_subject_id)


# ---------------------------------------------------------------------------
# Manage Subjects tab
# ---------------------------------------------------------------------------

def teacher_tab_manage_subjects():
    teacher_id = st.session_state.teacher_data['teacher_id']
    col1, col2 = st.columns(2)
    with col1:
        st.header('Manage Subjects')

    with col2:
        if st.button('Create New Subject', width="stretch"):
            create_subject_dialog(teacher_id)

    # LIST all SUBJECTS
    try:
        subjects = get_teacher_subjects(teacher_id)
    except DatabaseError as e:
        st.error(f"Could not load subjects: {e}")
        return

    if subjects:
        for sub in subjects:
            stats = [
                ("🫂", "Students", sub['total_students']),
                ("🕰️", "Classes", sub['total_classes']),
            ]

            def footer_actions(s=sub):
                col1, col2 = st.columns([3, 1])
                with col1:
                    if st.button(f"Share Code: {s['name']}", key=f"share_{s['subject_code']}", icon=":material/share:", width="stretch"):
                        share_subject_dialog(s['name'], s['subject_code'])
                with col2:
                    if st.button("Delete", key=f"delete_{s['subject_code']}", icon=":material/delete:", type="secondary", width="stretch"):
                        delete_subject_dialog(s['name'], s['subject_id'])
                st.write("")

            subject_card(
                name=sub['name'],
                code=sub['subject_code'],
                section=sub['section'],
                stats=stats,
                footer_callback=footer_actions
            )

            # Roster Inspector — load only when toggled open
            show_roster_key = f"show_roster_{sub['subject_id']}"
            if show_roster_key not in st.session_state:
                st.session_state[show_roster_key] = False

            if st.checkbox(
                f"👥 View Class Roster ({sub['total_students']} enrolled)",
                key=f"roster_cb_{sub['subject_id']}",
                value=st.session_state[show_roster_key],
            ):
                st.session_state[show_roster_key] = True
                _render_roster(sub)
            else:
                st.session_state[show_roster_key] = False

            st.write("")
    else:
        st.info("NO SUBJECTS FOUND. CREATE ONE ABOVE")


def _render_roster(sub):
    """Render the roster for *sub*, aggregating attendance in one query."""
    try:
        roster_res = safe_execute(
            supabase.table('subject_students')
            .select("*, students(*)")
            .eq('subject_id', sub['subject_id'])
        )
    except DatabaseError as e:
        st.error(f"Could not load roster: {e}")
        return

    roster = roster_res.data if roster_res.data else []

    if not roster:
        st.info("No students enrolled in this course yet.")
        return

    # Fetch all attendance for this subject in ONE query (not N+1)
    try:
        att_res = safe_execute(
            supabase.table('attendance_logs')
            .select('student_id, is_present')
            .eq('subject_id', sub['subject_id'])
        )
    except DatabaseError as e:
        st.error(f"Could not load attendance: {e}")
        return

    att_logs = att_res.data if att_res.data else []
    roster_data = compute_roster_data(roster, att_logs)

    roster_df = pd.DataFrame(roster_data)
    st.dataframe(roster_df, hide_index=True, use_container_width=True)

    # Remove enrollment selector
    st.write("")
    col_u1, col_u2 = st.columns([3, 1], vertical_alignment="bottom")
    with col_u1:
        student_map = {s['ID']: s['Name'] for s in roster_data}
        selected_sid = st.selectbox(
            "Select Student to Remove",
            options=list(student_map.keys()),
            format_func=lambda x: student_map[x],
            key=f"unenroll_sel_{sub['subject_id']}"
        )
    with col_u2:
        if st.button("Remove Student", key=f"unenroll_btn_{sub['subject_id']}", width="stretch", type="secondary"):
            try:
                unenroll_student_to_subject(selected_sid, sub['subject_id'])
                st.toast("Removed student from class roster successfully!")
                st.rerun()
            except DatabaseError as e:
                st.error(f"Failed to remove student: {e}")


# ---------------------------------------------------------------------------
# Attendance Records tab (Task 8 fixes)
# ---------------------------------------------------------------------------

def teacher_tab_attendance_records():
    st.header('Attendance Records')

    teacher_id = st.session_state.teacher_data['teacher_id']

    try:
        records = get_attendance_for_teacher(teacher_id)
    except DatabaseError as e:
        st.error(f"Could not load records: {e}")
        return

    if not records:
        st.info("No attendance records found yet. Take your first attendance to see records here.")
        return

    data = []
    for r in records:
        ts = r.get('timestamp')
        data.append({
            "ts_raw": ts,
            "ts_group": ts.split(".")[0] if ts else None,
            "Time": datetime.fromisoformat(ts).strftime("%Y-%m-%d %I:%M %p") if ts else "N/A",
            "Subject": r['subjects']['name'],
            "Subject Code": r['subjects']['subject_code'],
            "is_present": bool(r.get('is_present', False))
        })

    df = pd.DataFrame(data)

    if not df.empty:
        col_dr1, col_dr2 = st.columns(2)
        with col_dr1:
            today = datetime.now().date()
            thirty_days_ago = today - timedelta(days=30)
            selected_range = st.date_input(
                "Select Date Range",
                value=(thirty_days_ago, today),
                key="records_date_range"
            )

        # Handle incomplete date range (single date selected)
        if isinstance(selected_range, tuple) and len(selected_range) == 2:
            start_date, end_date = selected_range
            df['Date_Obj'] = pd.to_datetime(df['ts_group']).dt.date
            df = df[(df['Date_Obj'] >= start_date) & (df['Date_Obj'] <= end_date)]
        else:
            st.info("Please select both a start and end date to filter records.")
            return

    if df.empty:
        st.info("No attendance records found for the selected date range.")
        return

    summary = (
        df.groupby(['ts_group', 'Time', 'Subject', 'Subject Code'])
        .agg(
            Present_Count=('is_present', 'sum'),
            Total_Count=('is_present', 'count')
        ).reset_index()
    )

    summary['Attendance Stats'] = (
        "✅ " + summary['Present_Count'].astype(str) + " /"
        + summary['Total_Count'].astype(str) + ' Students'
    )

    # Visual Trend Chart Section
    subject_list = sorted(list(summary['Subject'].unique()))
    if len(subject_list) > 0:
        st.subheader("Attendance Trend Analysis")
        selected_trend_subject = st.selectbox(
            "Select Subject to View Trend Chart",
            options=["All Subjects"] + subject_list,
            key="trend_subject_selector"
        )

        summary['Attendance Rate (%)'] = (summary['Present_Count'] / summary['Total_Count'] * 100).round(1)
        # Parse ts_group as proper datetime for chart x-axis
        summary['Datetime'] = pd.to_datetime(summary['ts_group'])
        chart_df = summary.sort_values(by='Datetime')

        if selected_trend_subject != "All Subjects":
            chart_df = chart_df[chart_df['Subject'] == selected_trend_subject]

        if not chart_df.empty:
            chart_data = chart_df.set_index('Datetime')[['Attendance Rate (%)']]
            st.line_chart(chart_data)
        else:
            st.info("No data available for the selected subject trend.")

    st.subheader("All Sessions Log")

    display_df = (
        summary.sort_values(by='ts_group', ascending=False)
        [['Time', 'Subject', 'Subject Code', 'Attendance Stats']]
    )

    st.dataframe(display_df, use_container_width=True, hide_index=True)

    # CSV export
    csv_buffer = io.StringIO()
    display_df.to_csv(csv_buffer, index=False)
    st.download_button(
        label="📥 Export Sessions as CSV",
        data=csv_buffer.getvalue(),
        file_name="attendance_sessions.csv",
        mime="text/csv",
        use_container_width=True,
    )


# ---------------------------------------------------------------------------
# Login / Register
# ---------------------------------------------------------------------------

def login_teacher(username, password):
    if not username or not password:
        return False

    try:
        teacher = teacher_login(username, password)
    except DatabaseError as e:
        st.error(f"Database error during login: {e}")
        return False

    if teacher:
        st.session_state.user_role = 'teacher'
        st.session_state.teacher_data = teacher
        st.session_state.is_logged_in = True
        return True

    return False


def teacher_screen_login():
    c1, c2 = st.columns(2, vertical_alignment='center', gap='large')
    with c1:
        header_dashboard()
    with c2:
        if st.button("Go back to Home", type='secondary', key='teacher_login_back_btn'):
            st.session_state['login_type'] = None
            st.rerun()

    st.markdown("<h2 style='text-align: center; color: #000000;'>Login using password</h2>", unsafe_allow_html=True)
    st.write("")
    st.write("")

    teacher_username = st.text_input("Enter username", placeholder='shravanmole')
    teacher_pass = st.text_input("Enter password", type='password', placeholder="Enter password")

    st.divider()

    btnc1, btnc2 = st.columns(2)

    with btnc1:
        if st.button('Login', icon=':material/passkey:', width="stretch"):
            if login_teacher(teacher_username, teacher_pass):
                st.toast("welcome back!", icon="👋")
                time.sleep(1)
                st.rerun()
            else:
                st.error("Invalid username and password combo")

    with btnc2:
        if st.button('Register Instead', type="primary", icon=':material/passkey:', width="stretch"):
            st.session_state.teacher_login_type = 'register'

    footer_dashboard()


def register_teacher(teacher_username, teacher_name, teacher_pass, teacher_pass_confirm):
    valid, error = validate_registration_fields(teacher_username, teacher_name, teacher_pass)
    if not valid:
        return False, error
    try:
        if check_teacher_exists(teacher_username):
            return False, "Username already taken"
    except DatabaseError as e:
        return False, f"Database error: {e}"

    valid, error = validate_password(teacher_pass, teacher_pass_confirm)
    if not valid:
        return False, error

    try:
        result = create_teacher(teacher_username, teacher_pass, teacher_name)
        if not result:
            return False, "Could not create account. Please try again."
        return True, "Successfully Created! Login Now"
    except DatabaseError as e:
        return False, f"Database error: {e}"


def teacher_screen_register():
    c1, c2 = st.columns(2, vertical_alignment='center', gap='large')
    with c1:
        header_dashboard()
    with c2:
        if st.button("Go back to Home", type='secondary', key='teacher_register_back_btn'):
            st.session_state['login_type'] = None
            st.rerun()

    st.header('Register your teacher profile')

    st.write("")
    st.write("")

    teacher_username = st.text_input("Enter username", placeholder='shravanmole')
    teacher_name = st.text_input("Enter name", placeholder='Shravan Mole')
    teacher_pass = st.text_input("Enter password", type='password', placeholder="Enter password")
    teacher_pass_confirm = st.text_input("Confirm your password", type='password', placeholder="Enter password")

    st.divider()

    btnc1, btnc2 = st.columns(2)

    with btnc1:
        if st.button('Register now', icon=':material/passkey:', width="stretch"):
            success, message = register_teacher(teacher_username, teacher_name, teacher_pass, teacher_pass_confirm)
            if success:
                st.success(message)
                time.sleep(2)
                st.session_state.teacher_login_type = "login"
                st.rerun()
            else:
                st.error(message)

    with btnc2:
        if st.button('Login Instead', type="primary", icon=':material/passkey:', width="stretch"):
            st.session_state.teacher_login_type = 'login'

    footer_dashboard()