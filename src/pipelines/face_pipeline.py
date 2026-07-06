

import dlib
import numpy as np
import face_recognition_models
import streamlit as st
from PIL import Image
from src.utils.logger import logger

from src.database.db import get_all_students


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

def get_face_embeddings(image_np):
    try:
        detector, sp, facerec = load_dlib_models()
        
        # Resize image if it is too large to prevent CPU bottleneck and OOM
        h, w = image_np.shape[:2]
        max_dim = 1024
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            img_pil = Image.fromarray(image_np)
            img_pil = img_pil.resize((new_w, new_h), Image.Resampling.LANCZOS)
            image_np = np.array(img_pil)

        faces = detector(image_np, 1)

        encodings= []

        for face in faces:
            shape = sp(image_np, face)
            face_descriptor = facerec.compute_face_descriptor(image_np, shape, 1) #128 embedding

            encodings.append(np.array(face_descriptor))
        return encodings
    except Exception as e:
        import traceback
        logger.error(f"Error in face embedding extraction: {str(e)}\n{traceback.format_exc()}")
        return []

@st.cache_resource
def get_trained_model():
    student_db = get_all_students()

    if not student_db:
        return None
    
    X = []
    y = []
    
    for student in student_db:
        embedding = student.get('face_embedding')
        sid = student.get('student_id')
        if embedding and sid is not None:
            X.append(np.array(embedding))
            y.append(sid)

    if len(X) == 0:
        return None

    return {'X': X, "y": y}


def train_classifier():
    st.cache_resource.clear()
    model_data = get_trained_model()
    return bool(model_data)

def predict_attendance(class_image_np):
    try:
        encodings = get_face_embeddings(class_image_np)

        detected_student = {}

        model_data = get_trained_model()

        if not model_data:
            return detected_student, [], len(encodings)
        
        X_train = model_data['X']
        y_train = model_data['y']

        all_students = sorted(list(set(y_train)))
        resemblance_threshold = 0.6

        for encoding in encodings:
            best_match_score = float('inf')
            predicted_id = None

            # Compare encoding against all registered student templates using Euclidean distance
            for idx, student_embedding in enumerate(X_train):
                dist = np.linalg.norm(student_embedding - encoding)
                if dist < best_match_score:
                    best_match_score = dist
                    predicted_id = y_train[idx]

            if predicted_id is not None and best_match_score <= resemblance_threshold:
                detected_student[predicted_id] = True

        return detected_student, all_students, len(encodings)
    except Exception as e:
        import traceback
        logger.error(f"Error in predict_attendance: {str(e)}\n{traceback.format_exc()}")
        return {}, [], 0


