import unittest
from unittest.mock import patch, MagicMock
import numpy as np

# Setup basic streamlit mock config before importing pipeline modules
import streamlit as st

from src.pipelines.face_pipeline import predict_attendance
from src.pipelines.voice_pipeline import identify_speaker

class TestPipelines(unittest.TestCase):

    def test_identify_speaker_matching(self):
        # Setup mock 256-D voice embeddings
        emb_a = [1.0] + [0.0] * 255
        emb_b = [0.0, 1.0] + [0.0] * 254
        
        candidates = {
            1: emb_a,
            2: emb_b
        }
        
        # Test exact match (Alice)
        query = [1.0] + [0.0] * 255
        sid, score = identify_speaker(query, candidates, threshold=0.65)
        self.assertEqual(sid, 1)
        self.assertAlmostEqual(score, 1.0)
        
        # Test unmatched query (Bob)
        query_unmatched = [0.0, 0.0, 1.0] + [0.0] * 253
        sid, score = identify_speaker(query_unmatched, candidates, threshold=0.65)
        self.assertIsNone(sid)
        self.assertLess(score, 0.65)

    @patch('src.pipelines.face_pipeline.get_face_embeddings')
    @patch('src.pipelines.face_pipeline.get_all_students')
    def test_predict_attendance_nearest_neighbor(self, mock_get_all_students, mock_get_face_embeddings):
        # Mock student database records
        emb_student_1 = [1.0] + [0.0] * 127
        emb_student_2 = [0.0, 1.0] + [0.0] * 126
        
        mock_get_all_students.return_value = [
            {"student_id": 1, "name": "Alice", "face_embedding": emb_student_1},
            {"student_id": 2, "name": "Bob", "face_embedding": emb_student_2}
        ]
        
        # Clear streamlit resource caches to load mock data fresh
        st.cache_resource.clear()
        
        # Test matching Alice
        mock_get_face_embeddings.return_value = [np.array(emb_student_1)]
        detected, all_students, num_faces = predict_attendance(None)
        self.assertIn(1, detected)
        self.assertNotIn(2, detected)
        
        # Test matching Bob
        mock_get_face_embeddings.return_value = [np.array(emb_student_2)]
        detected, all_students, num_faces = predict_attendance(None)
        self.assertIn(2, detected)
        self.assertNotIn(1, detected)
        
        # Test face failing the resemblance threshold check
        unknown_emb = [0.0, 0.0, 1.0] + [0.0] * 125
        mock_get_face_embeddings.return_value = [np.array(unknown_emb)]
        detected, all_students, num_faces = predict_attendance(None)
        self.assertEqual(detected, {})

if __name__ == '__main__':
    unittest.main()
