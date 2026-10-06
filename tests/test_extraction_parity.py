"""Parity tests comparing original screen implementations against extracted services.

All 'old_*' helper functions below were transcribed verbatim from commit 08e5db7
(the last commit before Phase A extraction).

Source references from commit 08e5db7:
- old_face_attendance:        src/screens/teacher_screen.py (lines 218-243)
- old_separate_voice:         src/components/dialog_voice_attendance.py (lines 46-53)
- old_voice_attendance:       src/components/dialog_voice_attendance.py (lines 68-98)
- old_roster:                 src/screens/teacher_screen.py (lines 351-375)
- old_flatten, filter, agg:   src/screens/teacher_screen.py (lines 421-468)
- old_student_stats:          src/screens/student_screen.py (lines 80-92)
- old_duplicate_face:         src/screens/student_screen.py (lines 268-276)
- old_validate_reg / pw:      src/screens/teacher_screen.py (lines 576-602)
"""

from datetime import datetime
import unittest

import numpy as np
import pandas as pd

from src.services.attendance import (
    build_face_attendance_results,
    build_voice_attendance_results,
    separate_voice_candidates,
)
from src.services.auth_helpers import (
    check_duplicate_face,
    validate_password,
    validate_registration_fields,
)
from src.services.records import (
    aggregate_attendance_sessions,
    compute_student_subject_stats,
    filter_records_by_date,
    flatten_attendance_records,
)
from src.services.roster import compute_roster_data


# ===========================================================================
# 1. Face Attendance Results (Transcribed from 08e5db7: teacher_screen.py L218-243)
# ===========================================================================

def old_face_attendance(enrolled_students, all_detected_ids, subject_id, current_timestamp):
    results, attendance_to_log = [], []
    for node in enrolled_students:
        student = node['students']
        sources = all_detected_ids.get(int(student['student_id']), [])
        is_present = len(sources) > 0

        results.append({
            "Name": student['name'],
            "ID": student['student_id'],
            "Source": ", ".join(sources) if is_present else "-",
            "Status": "✅ Present" if is_present else "❌ Absent"
        })

        attendance_to_log.append({
            'student_id': student['student_id'],
            'subject_id': subject_id,
            'timestamp': current_timestamp,
            'is_present': bool(is_present)
        })
    return results, attendance_to_log


# ===========================================================================
# 2. Voice Candidate Separation (Transcribed from 08e5db7: dialog_voice_attendance.py L46-53)
# ===========================================================================

def old_separate_voice(enrolled_students):
    candidates_dict = {}
    no_profile_ids = set()
    for s in enrolled_students:
        student = s['students']
        if student.get('voice_embedding'):
            candidates_dict[student['student_id']] = student['voice_embedding']
        else:
            no_profile_ids.add(student['student_id'])
    return candidates_dict, no_profile_ids


# ===========================================================================
# 3. Voice Attendance Results (Transcribed from 08e5db7: dialog_voice_attendance.py L68-98)
# ===========================================================================

def old_voice_attendance(enrolled_students, detected_scores, no_profile_ids, subject_id, current_timestamp):
    results, attendance_to_log = [], []
    for node in enrolled_students:
        student = node['students']
        sid = student['student_id']

        if sid in no_profile_ids:
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

        if sid not in no_profile_ids:
            attendance_to_log.append({
                'student_id': sid,
                'subject_id': subject_id,
                'timestamp': current_timestamp,
                'is_present': bool(is_present)
            })
    return results, attendance_to_log


# ===========================================================================
# 4. Roster Data Computation (Transcribed from 08e5db7: teacher_screen.py L351-375)
# ===========================================================================

def old_roster(roster, att_logs):
    if att_logs:
        att_df = pd.DataFrame(att_logs)
        att_agg = att_df.groupby('student_id').agg(
            total=('is_present', 'count'),
            attended=('is_present', 'sum')
        ).reset_index()
        att_map = {int(row['student_id']): row for _, row in att_agg.iterrows()}
    else:
        att_map = {}

    roster_data = []
    for node in roster:
        student = node['students']
        sid = student['student_id']
        agg = att_map.get(sid, {})
        total_days = int(agg.get('total', 0))
        attended_days = int(agg.get('attended', 0))
        rate = (attended_days / total_days * 100) if total_days > 0 else 0.0

        roster_data.append({
            "Name": student['name'],
            "ID": sid,
            "Attended": f"{attended_days}/{total_days} classes",
            "Rate": f"{rate:.1f}%"
        })
    return roster_data


# ===========================================================================
# 5. Flatten, Filter & Aggregate Records (Transcribed from 08e5db7: teacher_screen.py L421-468)
# ===========================================================================

def old_flatten(records):
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
    return data


# ===========================================================================
# 6. Student Dashboard Stats (Transcribed from 08e5db7: student_screen.py L80-92)
# ===========================================================================

def old_student_stats(dashboard_data):
    results = []
    for node in dashboard_data:
        sub = node['subjects']
        logs = sub.get('attendance_logs', [])

        stats = {"total": 0, "attended": 0}
        for log in logs:
            stats['total'] += 1
            if log.get('is_present'):
                stats['attended'] += 1

        percentage = (stats['attended'] / stats['total'] * 100) if stats['total'] > 0 else 0.0
        results.append({
            "subject_id": sub['subject_id'],
            "subject_code": sub['subject_code'],
            "name": sub['name'],
            "section": sub['section'],
            "total": stats['total'],
            "attended": stats['attended'],
            "percentage": percentage,
        })
    return results


# ===========================================================================
# 7. Duplicate Face Check (Transcribed from 08e5db7: student_screen.py L268-276)
# ===========================================================================

def old_duplicate_face(face_emb, all_students):
    duplicate_student = None
    for student in all_students:
        emb = student.get('face_embedding')
        if emb:
            dist = np.linalg.norm(np.array(emb) - np.array(face_emb))
            if dist <= 0.6:
                duplicate_student = student
                break
    return duplicate_student


# ===========================================================================
# 8. Validation Helpers (Transcribed from 08e5db7: teacher_screen.py L576-602)
# ===========================================================================

def old_validate_reg(teacher_username, teacher_name, teacher_pass):
    if not teacher_username or not teacher_name or not teacher_pass:
        return False, "All Fields are required!"
    return True, None


def old_validate_pw(teacher_pass, teacher_pass_confirm):
    if teacher_pass != teacher_pass_confirm:
        return False, "Password doesn't match"

    if len(teacher_pass) < 8:
        return False, "Password must be at least 8 characters long!"
    if not any(char.isdigit() for char in teacher_pass):
        return False, "Password must contain at least one digit!"
    if not any(char.isupper() for char in teacher_pass):
        return False, "Password must contain at least one uppercase letter!"
    if not any(char.islower() for char in teacher_pass):
        return False, "Password must contain at least one lowercase letter!"

    return True, None


# ===========================================================================
# Test Suite: 100% Parity Assertion Between Old and Extracted Functions
# ===========================================================================

class TestExtractionParity(unittest.TestCase):

    def test_face_attendance_parity(self):
        enrolled = [
            {'students': {'student_id': 101, 'name': 'Alice'}},
            {'students': {'student_id': 102, 'name': 'Bob'}},
        ]
        detected = {101: ['Photo 1', 'Photo 2']}
        ts = '2026-10-06T12:00:00'

        old_res, old_log = old_face_attendance(enrolled, detected, 1, ts)
        new_res, new_log = build_face_attendance_results(enrolled, detected, 1, ts)

        self.assertEqual(old_res, new_res)
        self.assertEqual(old_log, new_log)

    def test_voice_candidates_separation_parity(self):
        enrolled = [
            {'students': {'student_id': 1, 'voice_embedding': [0.1, 0.2]}},
            {'students': {'student_id': 2, 'voice_embedding': None}},
            {'students': {'student_id': 3}},
        ]
        old_cand, old_np = old_separate_voice(enrolled)
        new_cand, new_np = separate_voice_candidates(enrolled)

        self.assertEqual(old_cand, new_cand)
        self.assertEqual(old_np, new_np)

    def test_voice_attendance_parity(self):
        enrolled = [
            {'students': {'student_id': 1, 'name': 'Alice'}},
            {'students': {'student_id': 2, 'name': 'Bob'}},
            {'students': {'student_id': 3, 'name': 'Charlie'}},
        ]
        scores = {1: 0.88}
        no_profile = {2}
        ts = '2026-10-06T12:00:00'

        old_res, old_log = old_voice_attendance(enrolled, scores, no_profile, 1, ts)
        new_res, new_log = build_voice_attendance_results(enrolled, scores, no_profile, 1, ts)

        self.assertEqual(old_res, new_res)
        self.assertEqual(old_log, new_log)

    def test_roster_data_parity(self):
        roster = [
            {'students': {'student_id': 10, 'name': 'Charlie'}},
            {'students': {'student_id': 20, 'name': 'Dana'}},
        ]
        att_logs = [
            {'student_id': 10, 'is_present': True},
            {'student_id': 10, 'is_present': False},
            {'student_id': 20, 'is_present': True},
        ]
        old_data = old_roster(roster, att_logs)
        new_data = compute_roster_data(roster, att_logs)

        self.assertEqual(old_data, new_data)

    def test_records_flatten_filter_aggregate_parity(self):
        recs = [
            {
                'timestamp': '2026-10-01T09:30:00.123456',
                'is_present': True,
                'subjects': {'name': 'Math', 'subject_code': 'M1'},
            },
            {
                'timestamp': '2026-10-01T09:30:00.654321',
                'is_present': False,
                'subjects': {'name': 'Math', 'subject_code': 'M1'},
            },
        ]
        # Flatten parity
        old_flat = old_flatten(recs)
        new_flat = flatten_attendance_records(recs)
        self.assertEqual(old_flat, new_flat)

        df = pd.DataFrame(old_flat)
        start_d = datetime(2026, 10, 1).date()
        end_d = datetime(2026, 10, 2).date()

        # Filter parity
        df_old = df.copy()
        df_old['Date_Obj'] = pd.to_datetime(df_old['ts_group']).dt.date
        old_filtered = df_old[(df_old['Date_Obj'] >= start_d) & (df_old['Date_Obj'] <= end_d)]
        new_filtered = filter_records_by_date(df, start_d, end_d)
        pd.testing.assert_frame_equal(old_filtered, new_filtered)

        # Aggregate parity
        old_summary = (
            df.groupby(['ts_group', 'Time', 'Subject', 'Subject Code'])
            .agg(Present_Count=('is_present', 'sum'), Total_Count=('is_present', 'count'))
            .reset_index()
        )
        old_summary['Attendance Stats'] = (
            '✅ ' + old_summary['Present_Count'].astype(str) + ' /'
            + old_summary['Total_Count'].astype(str) + ' Students'
        )
        new_summary = aggregate_attendance_sessions(df)
        pd.testing.assert_frame_equal(old_summary, new_summary)

    def test_student_dashboard_stats_parity(self):
        dash_data = [
            {
                'subjects': {
                    'subject_id': 5,
                    'subject_code': 'CS1',
                    'name': 'Intro CS',
                    'section': 'A',
                    'attendance_logs': [{'is_present': True}, {'is_present': False}],
                }
            },
            {
                'subjects': {
                    'subject_id': 6,
                    'subject_code': 'CS2',
                    'name': 'Data Structures',
                    'section': 'B',
                    'attendance_logs': [],
                }
            },
        ]
        old_s = old_student_stats(dash_data)
        new_s = compute_student_subject_stats(dash_data)
        self.assertEqual(old_s, new_s)

    def test_duplicate_face_check_parity(self):
        studs = [{'student_id': 1, 'name': 'Alice', 'face_embedding': [0.1] * 128}]
        match_cand = [0.12] * 128
        no_match_cand = [0.9] * 128

        self.assertEqual(
            old_duplicate_face(match_cand, studs),
            check_duplicate_face(match_cand, studs)
        )
        self.assertEqual(
            old_duplicate_face(no_match_cand, studs),
            check_duplicate_face(no_match_cand, studs)
        )

    def test_validation_helpers_parity(self):
        # Registration fields
        for u, n, p in [('', 'a', 'b'), ('a', '', 'b'), ('a', 'b', ''), ('a', 'b', 'c')]:
            self.assertEqual(
                old_validate_reg(u, n, p),
                validate_registration_fields(u, n, p)
            )

        # Password rules
        pw_cases = [
            ('abc', 'def'),
            ('short', 'short'),
            ('alllowercase1', 'alllowercase1'),
            ('ALLUPPERCASE1', 'ALLUPPERCASE1'),
            ('NoDigitsHere', 'NoDigitsHere'),
            ('ValidPass123', 'ValidPass123'),
        ]
        for p1, p2 in pw_cases:
            self.assertEqual(
                old_validate_pw(p1, p2),
                validate_password(p1, p2)
            )


if __name__ == '__main__':
    unittest.main()
