import streamlit as st
from src.database.db import enroll_student_to_subject
from src.database.config import supabase
import time


from src.database.db import create_attendance

def show_attendance_result(df, logs):
    st.write('Please review attendance before confirming.')
    
    # Initialize and sync session logs to allow interactive manual overrides
    if 'active_attendance_logs' not in st.session_state:
        st.session_state.active_attendance_logs = logs
        st.session_state.active_attendance_df = df
    else:
        # If the subject or dataset changed, reload
        stored = st.session_state.active_attendance_logs
        if stored and logs and (stored[0]['subject_id'] != logs[0]['subject_id'] or len(stored) != len(logs)):
            st.session_state.active_attendance_logs = logs
            st.session_state.active_attendance_df = df
            
    active_logs = st.session_state.active_attendance_logs
    active_df = st.session_state.active_attendance_df

    # Calculate stats from active logs
    total_count = len(active_logs)
    present_count = sum(1 for log in active_logs if log.get('is_present'))
    absent_count = total_count - present_count
    present_pct = (present_count / total_count * 100) if total_count > 0 else 0.0
    
    c_m1, c_m2, c_m3 = st.columns(3)
    with c_m1:
        st.metric("Total Students", total_count)
    with c_m2:
        st.metric("Present", present_count)
    with c_m3:
        st.metric("Absent", absent_count)
        
    st.progress(present_pct / 100.0)
    st.write("")
    
    # Render an interactive card grid for reviewing and toggling student presence
    st.write("### Student Roster Status")
    cols = st.columns(3)
    for idx, log in enumerate(active_logs):
        student_id = log['student_id']
        student_name = active_df.loc[active_df['ID'] == student_id, 'Name'].values[0] if not active_df.empty else f"Student #{student_id}"
        is_present = log['is_present']
        
        with cols[idx % 3]:
            # Define card properties
            card_bg = "#D1FAE5" if is_present else "#FEE2E2"
            border_color = "#10B981" if is_present else "#EF4444"
            text_color = "#065F46" if is_present else "#991B1B"
            
            st.markdown(
                f"""
                <div style="background-color: {card_bg}; border: 1.5px solid {border_color}; padding: 12px 15px; border-radius: 12px; margin-bottom: 8px;">
                    <div style="font-weight: bold; color: #1E293B; font-size: 1.05rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{student_name}</div>
                    <span style="color: {text_color}; font-size: 0.85rem; font-weight: bold;">
                        {"✅ Present" if is_present else "❌ Absent"}
                    </span>
                </div>
                """,
                unsafe_allow_html=True
            )
            
            btn_label = "Mark Absent" if is_present else "Mark Present"
            btn_type = "secondary" if is_present else "primary"
            
            if st.button(btn_label, key=f"toggle_att_{student_id}_{idx}", type=btn_type, use_container_width=True):
                # Update status
                log['is_present'] = not is_present
                # Update in df as well
                if not active_df.empty:
                    active_df.loc[active_df['ID'] == student_id, 'Status'] = "✅ Present" if not is_present else "❌ Absent"
                st.toast(f"Updated status for {student_name}!")
                st.rerun()

    st.write("")
    col1, col2 = st.columns(2)

    with col1:
        if st.button('Discard', width='stretch'):
            st.session_state.voice_attendance_results = None
            st.session_state.attendance_images = []
            st.session_state.pop('active_attendance_logs', None)
            st.session_state.pop('active_attendance_df', None)
            st.rerun()

    with col2:
        if st.button('Confirm & Save', width='stretch', type='primary'):
            try:
                create_attendance(active_logs)
                st.toast("Attendance taken")
                st.session_state.attendance_images = []
                st.session_state.voice_attendance_results = None
                st.session_state.pop('active_attendance_logs', None)
                st.session_state.pop('active_attendance_df', None)
                st.rerun()
            except Exception as e:
                st.error('Sync failed!')



@st.dialog("Attendance Reports")
def attendance_result_dialog(df, logs):
    show_attendance_result(df, logs)


