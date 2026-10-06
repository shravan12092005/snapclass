"""Characterization tests for the extracted service functions.

These tests record the exact outputs of the service functions for fixed inputs,
ensuring they behave identically to the inline code they replaced.
"""

import unittest

import numpy as np

from src.services.attendance import (
    build_face_attendance_results,
    separate_voice_candidates,
    build_voice_attendance_results,
)
from src.services.roster import compute_roster_data
from src.services.auth_helpers import (
    face_login_decision,
    check_duplicate_face,
    validate_registration_fields,
    validate_password,
)


# ---------------------------------------------------------------------------
# build_face_attendance_results
# ---------------------------------------------------------------------------

class TestBuildFaceAttendanceResults(unittest.TestCase):

    def test_basic_face_results(self):
        enrolled = [
            {"students": {"student_id": 1, "name": "Alice"}},
            {"students": {"student_id": 2, "name": "Bob"}},
        ]
        detected = {1: ["Photo 1", "Photo 2"]}
        results, logs = build_face_attendance_results(enrolled, detected, 100, "2024-01-01T10:00:00")

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["Name"], "Alice")
        self.assertEqual(results[0]["ID"], 1)
        self.assertEqual(results[0]["Status"], "\u2705 Present")
        self.assertEqual(results[0]["Source"], "Photo 1, Photo 2")
        self.assertEqual(results[1]["Name"], "Bob")
        self.assertEqual(results[1]["Status"], "\u274c Absent")
        self.assertEqual(results[1]["Source"], "-")

        self.assertEqual(len(logs), 2)
        self.assertTrue(logs[0]["is_present"])
        self.assertFalse(logs[1]["is_present"])
        self.assertEqual(logs[0]["subject_id"], 100)
        self.assertEqual(logs[0]["timestamp"], "2024-01-01T10:00:00")

    def test_empty_enrolled(self):
        results, logs = build_face_attendance_results([], {}, 1, "2024-01-01T10:00:00")
        self.assertEqual(results, [])
        self.assertEqual(logs, [])

    def test_no_detections(self):
        enrolled = [{"students": {"student_id": 1, "name": "Alice"}}]
        results, logs = build_face_attendance_results(enrolled, {}, 1, "2024-01-01T10:00:00")
        self.assertEqual(results[0]["Status"], "\u274c Absent")
        self.assertFalse(logs[0]["is_present"])

    def test_all_detected(self):
        enrolled = [
            {"students": {"student_id": 1, "name": "Alice"}},
            {"students": {"student_id": 2, "name": "Bob"}},
        ]
        detected = {1: ["Photo 1"], 2: ["Photo 1"]}
        results, logs = build_face_attendance_results(enrolled, detected, 5, "T")
        self.assertTrue(all(r["Status"] == "\u2705 Present" for r in results))
        self.assertTrue(all(log["is_present"] for log in logs))


# ---------------------------------------------------------------------------
# separate_voice_candidates
# ---------------------------------------------------------------------------

class TestSeparateVoiceCandidates(unittest.TestCase):

    def test_separation(self):
        enrolled = [
            {"students": {"student_id": 1, "name": "Alice", "voice_embedding": [1.0, 2.0]}},
            {"students": {"student_id": 2, "name": "Bob", "voice_embedding": None}},
            {"students": {"student_id": 3, "name": "Charlie", "voice_embedding": []}},
        ]
        cands, no_profile = separate_voice_candidates(enrolled)
        self.assertEqual(set(cands.keys()), {1})
        self.assertEqual(cands[1], [1.0, 2.0])
        self.assertEqual(no_profile, {2, 3})

    def test_all_have_profiles(self):
        enrolled = [
            {"students": {"student_id": 1, "name": "A", "voice_embedding": [1.0]}},
        ]
        cands, no_profile = separate_voice_candidates(enrolled)
        self.assertEqual(len(cands), 1)
        self.assertEqual(no_profile, set())

    def test_none_have_profiles(self):
        enrolled = [
            {"students": {"student_id": 1, "name": "A", "voice_embedding": None}},
        ]
        cands, no_profile = separate_voice_candidates(enrolled)
        self.assertEqual(len(cands), 0)
        self.assertEqual(no_profile, {1})


# ---------------------------------------------------------------------------
# build_voice_attendance_results
# ---------------------------------------------------------------------------

class TestBuildVoiceAttendanceResults(unittest.TestCase):

    def test_voice_results_with_no_profile(self):
        enrolled = [
            {"students": {"student_id": 1, "name": "Alice"}},
            {"students": {"student_id": 2, "name": "Bob"}},
            {"students": {"student_id": 3, "name": "Charlie"}},
        ]
        detected_scores = {1: 0.85}
        no_profile_ids = {3}

        results, logs = build_voice_attendance_results(
            enrolled, detected_scores, no_profile_ids, 100, "2024-01-01T10:00:00"
        )

        # Alice: present (detected)
        self.assertEqual(results[0]["Status"], "\u2705 Present")
        self.assertEqual(results[0]["Source"], 0.85)
        # Bob: absent (not detected, but has profile)
        self.assertEqual(results[1]["Status"], "\u274c Absent")
        self.assertEqual(results[1]["Source"], "-")
        # Charlie: no voice profile
        self.assertEqual(results[2]["Status"], "\u26a0\ufe0f No voice profile")
        self.assertEqual(results[2]["Source"], "N/A")

        # Only Alice and Bob in logs (Charlie excluded)
        self.assertEqual(len(logs), 2)
        log_ids = [log["student_id"] for log in logs]
        self.assertIn(1, log_ids)
        self.assertIn(2, log_ids)
        self.assertNotIn(3, log_ids)
        self.assertTrue(logs[0]["is_present"])   # Alice
        self.assertFalse(logs[1]["is_present"])   # Bob

    def test_empty_enrolled(self):
        results, logs = build_voice_attendance_results([], {}, set(), 1, "T")
        self.assertEqual(results, [])
        self.assertEqual(logs, [])


# ---------------------------------------------------------------------------
# compute_roster_data
# ---------------------------------------------------------------------------

class TestComputeRosterData(unittest.TestCase):

    def test_roster_with_attendance(self):
        roster = [
            {"students": {"student_id": 1, "name": "Alice"}},
            {"students": {"student_id": 2, "name": "Bob"}},
        ]
        att_logs = [
            {"student_id": 1, "is_present": True},
            {"student_id": 1, "is_present": True},
            {"student_id": 1, "is_present": False},
            {"student_id": 2, "is_present": True},
            {"student_id": 2, "is_present": False},
        ]
        data = compute_roster_data(roster, att_logs)

        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["Name"], "Alice")
        self.assertEqual(data[0]["ID"], 1)
        self.assertEqual(data[0]["Attended"], "2/3 classes")
        self.assertEqual(data[0]["Rate"], "66.7%")
        self.assertEqual(data[1]["Name"], "Bob")
        self.assertEqual(data[1]["Attended"], "1/2 classes")
        self.assertEqual(data[1]["Rate"], "50.0%")

    def test_roster_no_attendance(self):
        roster = [{"students": {"student_id": 1, "name": "Alice"}}]
        data = compute_roster_data(roster, [])
        self.assertEqual(data[0]["Attended"], "0/0 classes")
        self.assertEqual(data[0]["Rate"], "0.0%")

    def test_roster_perfect_attendance(self):
        roster = [{"students": {"student_id": 1, "name": "Alice"}}]
        att_logs = [
            {"student_id": 1, "is_present": True},
            {"student_id": 1, "is_present": True},
        ]
        data = compute_roster_data(roster, att_logs)
        self.assertEqual(data[0]["Rate"], "100.0%")


# ---------------------------------------------------------------------------
# face_login_decision
# ---------------------------------------------------------------------------

class TestFaceLoginDecision(unittest.TestCase):

    def test_no_face(self):
        self.assertEqual(face_login_decision({}, 0), ("no_face",))

    def test_multi_face(self):
        self.assertEqual(face_login_decision({}, 2), ("multi_face",))
        self.assertEqual(face_login_decision({42: True}, 3), ("multi_face",))

    def test_recognized(self):
        self.assertEqual(face_login_decision({42: True}, 1), ("recognized", 42))

    def test_not_recognized(self):
        self.assertEqual(face_login_decision({}, 1), ("not_recognized",))


# ---------------------------------------------------------------------------
# check_duplicate_face
# ---------------------------------------------------------------------------

class TestCheckDuplicateFace(unittest.TestCase):

    def test_finds_duplicate(self):
        emb = [1.0] + [0.0] * 127
        students = [{"student_id": 1, "name": "Alice", "face_embedding": emb}]
        result = check_duplicate_face(emb, students)
        self.assertIsNotNone(result)
        self.assertEqual(result["student_id"], 1)

    def test_no_duplicate(self):
        emb = [1.0] + [0.0] * 127
        other = [0.0, 1.0] + [0.0] * 126
        students = [{"student_id": 1, "name": "Bob", "face_embedding": other}]
        result = check_duplicate_face(emb, students)
        self.assertIsNone(result)

    def test_no_embedding_in_student(self):
        students = [{"student_id": 1, "name": "Bob", "face_embedding": None}]
        result = check_duplicate_face([1.0] + [0.0] * 127, students)
        self.assertIsNone(result)

    def test_empty_students_list(self):
        result = check_duplicate_face([1.0] + [0.0] * 127, [])
        self.assertIsNone(result)

    def test_threshold_boundary(self):
        """Exact threshold distance should still match (<=)."""
        base = np.array([1.0] + [0.0] * 127)
        # Create embedding exactly 0.6 away
        offset = np.zeros(128)
        offset[0] = 0.6
        far_emb = (base - offset).tolist()
        students = [{"student_id": 1, "name": "A", "face_embedding": base.tolist()}]
        result = check_duplicate_face(far_emb, students, threshold=0.6)
        self.assertIsNotNone(result)


# ---------------------------------------------------------------------------
# validate_registration_fields / validate_password
# ---------------------------------------------------------------------------

class TestValidateRegistrationFields(unittest.TestCase):

    def test_valid(self):
        ok, err = validate_registration_fields("user", "Name", "pass")
        self.assertTrue(ok)
        self.assertIsNone(err)

    def test_empty_username(self):
        ok, err = validate_registration_fields("", "Name", "pass")
        self.assertFalse(ok)
        self.assertEqual(err, "All Fields are required!")

    def test_empty_name(self):
        ok, err = validate_registration_fields("user", "", "pass")
        self.assertFalse(ok)

    def test_empty_password(self):
        ok, err = validate_registration_fields("user", "Name", "")
        self.assertFalse(ok)


class TestValidatePassword(unittest.TestCase):

    def test_valid(self):
        ok, err = validate_password("Strong1Pass", "Strong1Pass")
        self.assertTrue(ok)
        self.assertIsNone(err)

    def test_mismatch(self):
        ok, err = validate_password("Strong1Pass", "Different1Pass")
        self.assertFalse(ok)
        self.assertEqual(err, "Password doesn't match")

    def test_too_short(self):
        ok, err = validate_password("Sh1rt", "Sh1rt")
        self.assertFalse(ok)
        self.assertIn("8 characters", err)

    def test_no_digit(self):
        ok, err = validate_password("StrongPass", "StrongPass")
        self.assertFalse(ok)
        self.assertIn("digit", err)

    def test_no_uppercase(self):
        ok, err = validate_password("strong1pass", "strong1pass")
        self.assertFalse(ok)
        self.assertIn("uppercase", err)

    def test_no_lowercase(self):
        ok, err = validate_password("STRONG1PASS", "STRONG1PASS")
        self.assertFalse(ok)
        self.assertIn("lowercase", err)


# ---------------------------------------------------------------------------
# flatten_attendance_records / filter / aggregate / student stats
# ---------------------------------------------------------------------------

from datetime import date
from src.services.records import (
    flatten_attendance_records,
    filter_records_by_date,
    aggregate_attendance_sessions,
    compute_student_subject_stats,
)


class TestFlattenAttendanceRecords(unittest.TestCase):

    def test_basic_flatten(self):
        records = [
            {
                "timestamp": "2024-03-15T10:00:00",
                "is_present": True,
                "subjects": {"name": "Math", "subject_code": "MATH101"},
            },
            {
                "timestamp": "2024-03-15T10:00:00",
                "is_present": False,
                "subjects": {"name": "Math", "subject_code": "MATH101"},
            },
        ]
        data = flatten_attendance_records(records)
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["ts_group"], "2024-03-15T10:00:00")
        self.assertEqual(data[0]["Subject"], "Math")
        self.assertEqual(data[0]["Subject Code"], "MATH101")
        self.assertTrue(data[0]["is_present"])
        self.assertFalse(data[1]["is_present"])
        self.assertIn("2024-03-15", data[0]["Time"])

    def test_empty_records(self):
        self.assertEqual(flatten_attendance_records([]), [])

    def test_timestamp_with_fractional_seconds(self):
        records = [
            {
                "timestamp": "2024-03-15T10:00:00.123456",
                "is_present": True,
                "subjects": {"name": "A", "subject_code": "A1"},
            }
        ]
        data = flatten_attendance_records(records)
        # ts_group strips fractional seconds
        self.assertEqual(data[0]["ts_group"], "2024-03-15T10:00:00")


class TestFilterRecordsByDate(unittest.TestCase):

    def test_filter_in_range(self):
        import pandas as pd
        df = pd.DataFrame([
            {"ts_group": "2024-03-10T10:00:00", "x": 1},
            {"ts_group": "2024-03-15T10:00:00", "x": 2},
            {"ts_group": "2024-03-20T10:00:00", "x": 3},
        ])
        result = filter_records_by_date(df, date(2024, 3, 12), date(2024, 3, 18))
        self.assertEqual(len(result), 1)
        self.assertEqual(result.iloc[0]["x"], 2)

    def test_inclusive_boundaries(self):
        import pandas as pd
        df = pd.DataFrame([
            {"ts_group": "2024-03-10T10:00:00", "x": 1},
            {"ts_group": "2024-03-15T10:00:00", "x": 2},
        ])
        result = filter_records_by_date(df, date(2024, 3, 10), date(2024, 3, 10))
        self.assertEqual(len(result), 1)
        self.assertEqual(result.iloc[0]["x"], 1)


class TestAggregateAttendanceSessions(unittest.TestCase):

    def test_basic_aggregation(self):
        import pandas as pd
        df = pd.DataFrame([
            {"ts_group": "2024-03-15T10:00:00", "Time": "2024-03-15 10:00 AM",
             "Subject": "Math", "Subject Code": "M101", "is_present": True},
            {"ts_group": "2024-03-15T10:00:00", "Time": "2024-03-15 10:00 AM",
             "Subject": "Math", "Subject Code": "M101", "is_present": False},
            {"ts_group": "2024-03-15T10:00:00", "Time": "2024-03-15 10:00 AM",
             "Subject": "Math", "Subject Code": "M101", "is_present": True},
        ])
        summary = aggregate_attendance_sessions(df)
        self.assertEqual(len(summary), 1)
        self.assertEqual(summary.iloc[0]["Present_Count"], 2)
        self.assertEqual(summary.iloc[0]["Total_Count"], 3)
        self.assertIn("2 /3", summary.iloc[0]["Attendance Stats"])

    def test_multiple_sessions(self):
        import pandas as pd
        df = pd.DataFrame([
            {"ts_group": "T1", "Time": "Time1", "Subject": "A", "Subject Code": "A1", "is_present": True},
            {"ts_group": "T2", "Time": "Time2", "Subject": "B", "Subject Code": "B1", "is_present": False},
        ])
        summary = aggregate_attendance_sessions(df)
        self.assertEqual(len(summary), 2)


class TestComputeStudentSubjectStats(unittest.TestCase):

    def test_basic_stats(self):
        dashboard_data = [
            {
                "subjects": {
                    "subject_id": 1, "subject_code": "M101",
                    "name": "Math", "section": "A",
                    "attendance_logs": [
                        {"is_present": True},
                        {"is_present": True},
                        {"is_present": False},
                    ]
                }
            }
        ]
        stats = compute_student_subject_stats(dashboard_data)
        self.assertEqual(len(stats), 1)
        self.assertEqual(stats[0]["total"], 3)
        self.assertEqual(stats[0]["attended"], 2)
        self.assertAlmostEqual(stats[0]["percentage"], 66.666, places=2)

    def test_no_logs(self):
        dashboard_data = [
            {
                "subjects": {
                    "subject_id": 1, "subject_code": "X",
                    "name": "X", "section": "A",
                    "attendance_logs": []
                }
            }
        ]
        stats = compute_student_subject_stats(dashboard_data)
        self.assertEqual(stats[0]["total"], 0)
        self.assertEqual(stats[0]["percentage"], 0.0)

    def test_empty_data(self):
        self.assertEqual(compute_student_subject_stats([]), [])
        self.assertEqual(compute_student_subject_stats(None), [])

    def test_perfect_attendance(self):
        dashboard_data = [
            {
                "subjects": {
                    "subject_id": 5, "subject_code": "P",
                    "name": "Physics", "section": "B",
                    "attendance_logs": [
                        {"is_present": True},
                        {"is_present": True},
                    ]
                }
            }
        ]
        stats = compute_student_subject_stats(dashboard_data)
        self.assertEqual(stats[0]["percentage"], 100.0)


if __name__ == '__main__':
    unittest.main()
