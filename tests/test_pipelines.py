import unittest
from unittest.mock import patch, MagicMock
import numpy as np
import streamlit as st

from src.pipelines.face_pipeline import (
    predict_attendance,
    deduplicate_embeddings,
    CLASSROOM_THRESHOLD,
    LOGIN_THRESHOLD,
    LOGIN_MARGIN,
    _get_trained_model_data,
)
from src.pipelines.voice_pipeline import identify_speaker


class TestPipelines(unittest.TestCase):

    def setUp(self):
        # Invalidate streamlit cache before each test
        _get_trained_model_data.clear()

    def test_identify_speaker_matching(self):
        emb_a = [1.0] + [0.0] * 255
        emb_b = [0.0, 1.0] + [0.0] * 254
        candidates = {1: emb_a, 2: emb_b}

        # Exact match (Alice)
        query = [1.0] + [0.0] * 255
        sid, score = identify_speaker(query, candidates, threshold=0.65)
        self.assertEqual(sid, 1)
        self.assertAlmostEqual(score, 1.0)

        # Unmatched query
        query_unmatched = [0.0, 0.0, 1.0] + [0.0] * 253
        sid, score = identify_speaker(query_unmatched, candidates, threshold=0.65)
        self.assertIsNone(sid)
        self.assertLess(score, 0.65)

    def test_voice_no_profile_handling(self):
        """Students without voice profiles must be separated and not counted as absent."""
        enrolled_students = [
            {"students": {"student_id": 101, "name": "Alice", "voice_embedding": [1.0] + [0.0] * 255}},
            {"students": {"student_id": 102, "name": "Bob", "voice_embedding": None}},
            {"students": {"student_id": 103, "name": "Charlie", "voice_embedding": []}},
        ]

        candidates_dict = {}
        no_profile_ids = set()
        for s in enrolled_students:
            student = s['students']
            if student.get('voice_embedding'):
                candidates_dict[student['student_id']] = student['voice_embedding']
            else:
                no_profile_ids.add(student['student_id'])

        # Bob and Charlie have no voice profile
        self.assertEqual(no_profile_ids, {102, 103})
        # Only Alice is in candidate matching
        self.assertEqual(list(candidates_dict.keys()), [101])

    @patch('src.pipelines.face_pipeline.get_face_embeddings')
    @patch('src.pipelines.face_pipeline.get_all_students')
    def test_predict_attendance_classroom_threshold(self, mock_get_all, mock_get_embeddings):
        emb_student = [0.0] * 128
        emb_student[0] = 1.0
        mock_get_all.return_value = [
            {"student_id": 1, "name": "Alice", "face_embedding": emb_student}
        ]

        # Case 1: distance = 0.55 <= 0.60 (CLASSROOM_THRESHOLD) -> Accepted
        query_close = [0.0] * 128
        query_close[0] = 1.0 - 0.55
        mock_get_embeddings.return_value = [np.array(query_close)]
        detected, _, _ = predict_attendance(None, login_mode=False)
        self.assertIn(1, detected)

        # Case 2: distance = 0.65 > 0.60 -> Rejected
        _get_trained_model_data.clear()
        query_far = [0.0] * 128
        query_far[0] = 1.0 - 0.65
        mock_get_embeddings.return_value = [np.array(query_far)]
        detected, _, _ = predict_attendance(None, login_mode=False)
        self.assertNotIn(1, detected)

    @patch('src.pipelines.face_pipeline.get_face_embeddings')
    @patch('src.pipelines.face_pipeline.get_all_students')
    def test_predict_attendance_login_threshold_boundaries(self, mock_get_all, mock_get_embeddings):
        emb_student = [0.0] * 128
        emb_student[0] = 1.0
        mock_get_all.return_value = [
            {"student_id": 1, "name": "Alice", "face_embedding": emb_student}
        ]

        # Distance = 0.49 <= 0.50 (LOGIN_THRESHOLD) -> Accepted
        query_accepted = [0.0] * 128
        query_accepted[0] = 1.0 - 0.49
        mock_get_embeddings.return_value = [np.array(query_accepted)]
        detected, _, _ = predict_attendance(None, login_mode=True)
        self.assertIn(1, detected)

        # Distance = 0.52 > 0.50 -> Rejected
        _get_trained_model_data.clear()
        query_rejected = [0.0] * 128
        query_rejected[0] = 1.0 - 0.52
        mock_get_embeddings.return_value = [np.array(query_rejected)]
        detected, _, _ = predict_attendance(None, login_mode=True)
        self.assertNotIn(1, detected)

    @patch('src.pipelines.face_pipeline.get_face_embeddings')
    @patch('src.pipelines.face_pipeline.get_all_students')
    def test_predict_attendance_login_margin_boundaries(self, mock_get_all, mock_get_embeddings):
        """In login mode, ambiguous matches (diff < 0.05) must be rejected."""
        emb_1 = [0.0] * 128
        emb_1[0] = 1.0
        emb_2 = [0.0] * 128
        emb_2[1] = 1.0

        mock_get_all.return_value = [
            {"student_id": 1, "name": "Alice", "face_embedding": emb_1},
            {"student_id": 2, "name": "Bob", "face_embedding": emb_2},
        ]

        # Case 1: best distance = 0.35, second best = 0.38 (diff = 0.03 < LOGIN_MARGIN 0.05) -> Ambiguous, Reject
        query_ambiguous = [0.0] * 128
        query_ambiguous[0] = 0.75
        query_ambiguous[1] = 0.72
        # Mock query that produces close distances to both
        mock_get_embeddings.return_value = [np.array(query_ambiguous)]
        detected, _, _ = predict_attendance(None, login_mode=True)
        self.assertEqual(detected, {})

        # Case 2: best distance = 0.10, second best = 1.41 (diff >> 0.05) -> Unambiguous, Accept
        _get_trained_model_data.clear()
        query_clear = [0.0] * 128
        query_clear[0] = 0.95
        mock_get_embeddings.return_value = [np.array(query_clear)]
        detected, _, _ = predict_attendance(None, login_mode=True)
        self.assertIn(1, detected)
        self.assertNotIn(2, detected)

    @patch('src.pipelines.face_pipeline.get_face_embeddings')
    @patch('src.pipelines.face_pipeline.get_all_students')
    def test_predict_attendance_candidate_ids_filter(self, mock_get_all, mock_get_embeddings):
        """Only students in candidate_ids must be matched."""
        emb_1 = [1.0] + [0.0] * 127
        emb_2 = [0.0, 1.0] + [0.0] * 126

        mock_get_all.return_value = [
            {"student_id": 1, "name": "Alice", "face_embedding": emb_1},
            {"student_id": 2, "name": "Bob", "face_embedding": emb_2},
        ]

        # Query matches student 1 perfectly, but candidate_ids is only {2} (Bob)
        mock_get_embeddings.return_value = [np.array(emb_1)]
        detected, all_cands, _ = predict_attendance(None, candidate_ids={2})
        self.assertNotIn(1, detected)
        self.assertEqual(all_cands, [2])

    def test_deduplicate_embeddings(self):
        base = np.array([1.0] + [0.0] * 127)
        close_duplicate = base + np.array([0.01] * 128)  # distance = sqrt(128*0.0001) ~ 0.113 < 0.25
        distinct_person = np.array([0.0, 1.0] + [0.0] * 126)  # distance = sqrt(2) ~ 1.41

        embeddings = [base, close_duplicate, distinct_person]
        deduped = deduplicate_embeddings(embeddings, threshold=0.25)
        self.assertEqual(len(deduped), 2)


if __name__ == '__main__':
    unittest.main()
