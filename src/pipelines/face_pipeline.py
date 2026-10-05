import traceback

import dlib
import numpy as np
import face_recognition_models
import streamlit as st
from PIL import Image

from src.utils.logger import logger
from src.database.db import get_all_students

# ---------------------------------------------------------------------------
# Configurable thresholds (Task 7)
# ---------------------------------------------------------------------------

# Classroom bulk matching — accept if best distance <= this
CLASSROOM_THRESHOLD = 0.6

# Login matching — stricter: best distance must be <= this …
LOGIN_THRESHOLD = 0.5

# … AND the second-best student must be at least this much further away
LOGIN_MARGIN = 0.05


# ---------------------------------------------------------------------------
# dlib model loading
# ---------------------------------------------------------------------------

@st.cache_resource
def load_dlib_models():
    detector = dlib.get_frontal_face_detector()

    sp = dlib.shape_predictor(
        face_recognition_models.pose_predictor_model_location()
    )

    facerec = dlib.face_recognition_model_v1(
        face_recognition_models.face_recognition_model_location()
    )

    return detector, sp, facerec


# ---------------------------------------------------------------------------
# Embedding extraction
# ---------------------------------------------------------------------------

def deduplicate_embeddings(embeddings, threshold=0.25):
    """Remove duplicate face embeddings that are closer than threshold."""
    unique = []
    for emb in embeddings:
        if not any(np.linalg.norm(emb - u) < threshold for u in unique):
            unique.append(emb)
    return unique


def get_face_embeddings(image_np):
    """Extract 128-D face embeddings from *image_np* (H×W×3 uint8 array).
    
    For images larger than 1024px, runs detection on overlapping tiles
    so small back-row faces aren't lost, and deduplicates the embeddings.
    """
    try:
        detector, sp, facerec = load_dlib_models()

        def _extract_from_img(img_arr):
            faces = detector(img_arr, 1)
            encs = []
            for face in faces:
                shape = sp(img_arr, face)
                face_desc = facerec.compute_face_descriptor(img_arr, shape, 1)
                encs.append(np.array(face_desc))
            return encs

        h, w = image_np.shape[:2]
        max_dim = 1024
        if max(h, w) <= max_dim:
            return _extract_from_img(image_np)

        # For large classroom photos:
        all_encodings = []

        # 1. Downsampled full image pass to detect large foreground faces
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        img_pil = Image.fromarray(image_np).resize((new_w, new_h), Image.Resampling.LANCZOS)
        all_encodings.extend(_extract_from_img(np.array(img_pil)))

        # 2. Overlapping native tiles pass to catch small back-row faces
        tile_size = 1024
        overlap = 256
        step = tile_size - overlap

        for y in range(0, h, step):
            for x in range(0, w, step):
                y_end = min(y + tile_size, h)
                x_end = min(x + tile_size, w)
                tile = image_np[y:y_end, x:x_end]
                if tile.shape[0] >= 100 and tile.shape[1] >= 100:
                    all_encodings.extend(_extract_from_img(tile))

        return deduplicate_embeddings(all_encodings, threshold=0.25)
    except Exception as e:
        logger.error(f"Error in face embedding extraction: {str(e)}\n{traceback.format_exc()}")
        return []


# ---------------------------------------------------------------------------
# Trained model cache
# ---------------------------------------------------------------------------

@st.cache_data(ttl=60)
def _get_trained_model_data():
    """Fetch student embeddings and return a serialisable dict (or None)."""
    student_db = get_all_students()

    if not student_db:
        return None

    X = []
    y = []

    for student in student_db:
        embedding = student.get('face_embedding')
        sid = student.get('student_id')
        if embedding and sid is not None:
            X.append(embedding)  # keep as list for cache serialisation
            y.append(sid)

    if len(X) == 0:
        return None

    return {'X': X, "y": y}


# Backwards-compatible alias expected by tests
get_trained_model = _get_trained_model_data


def train_classifier():
    """Invalidate the embedding cache so the next call picks up new data."""
    _get_trained_model_data.clear()
    model_data = _get_trained_model_data()
    return bool(model_data)


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

def predict_attendance(class_image_np, *, candidate_ids=None, login_mode=False):
    """Detect faces and match against stored embeddings.

    Parameters
    ----------
    class_image_np : ndarray or None
        The classroom photo (H×W×3).
    candidate_ids : set | None
        If given, only match against students with these IDs (e.g. enrolled
        students).  ``None`` means match against all registered students.
    login_mode : bool
        If ``True``, use the stricter ``LOGIN_THRESHOLD`` and require a
        margin of ``LOGIN_MARGIN`` between best and second-best match.
    """
    try:
        encodings = get_face_embeddings(class_image_np)

        detected_student = {}

        model_data = _get_trained_model_data()

        if not model_data:
            return detected_student, [], len(encodings)

        X_train = [np.array(x) for x in model_data['X']]
        y_train = model_data['y']

        # Filter to candidate_ids when provided
        if candidate_ids is not None:
            pairs = [(x, y) for x, y in zip(X_train, y_train) if y in candidate_ids]
            if not pairs:
                return detected_student, [], len(encodings)
            X_train, y_train = zip(*pairs)
            X_train, y_train = list(X_train), list(y_train)

        all_students = sorted(list(set(y_train)))

        threshold = LOGIN_THRESHOLD if login_mode else CLASSROOM_THRESHOLD

        for encoding in encodings:
            distances = []
            for idx, student_embedding in enumerate(X_train):
                dist = np.linalg.norm(student_embedding - encoding)
                distances.append((dist, y_train[idx]))

            distances.sort(key=lambda x: x[0])

            if not distances:
                continue

            best_dist, best_id = distances[0]

            if best_dist <= threshold:
                if login_mode and len(distances) > 1:
                    second_dist = distances[1][0]
                    if (second_dist - best_dist) < LOGIN_MARGIN:
                        # Too ambiguous — reject
                        continue
                detected_student[best_id] = True

        return detected_student, all_students, len(encodings)
    except Exception as e:
        logger.error(f"Error in predict_attendance: {str(e)}\n{traceback.format_exc()}")
        return {}, [], 0
