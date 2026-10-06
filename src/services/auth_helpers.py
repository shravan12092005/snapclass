"""Authentication helpers — pure logic, no UI or DB calls.

Extracted from student_screen.py and teacher_screen.py.
"""

import numpy as np


def face_login_decision(detected, num_faces):
    """Determine the outcome of a face-login attempt.

    Parameters
    ----------
    detected : dict
        ``{student_id: True}`` for matched faces (from predict_attendance).
    num_faces : int
        Number of faces detected in the image.

    Returns
    -------
    tuple
        One of:
        - ``("no_face",)`` — no face detected
        - ``("multi_face",)`` — multiple faces detected
        - ``("recognized", student_id)`` — single match found
        - ``("not_recognized",)`` — face found but not matched
    """
    if num_faces == 0:
        return ("no_face",)
    if num_faces > 1:
        return ("multi_face",)
    if detected:
        student_id = list(detected.keys())[0]
        return ("recognized", student_id)
    return ("not_recognized",)


def check_duplicate_face(face_emb, all_students, threshold=0.6):
    """Check whether *face_emb* matches any existing student.

    Parameters
    ----------
    face_emb : list[float]
        128-D face embedding of the candidate.
    all_students : list[dict]
        Student records, each optionally containing ``face_embedding``.
    threshold : float
        Maximum L2 distance to consider a match.

    Returns
    -------
    dict | None
        The matching student record, or ``None``.
    """
    for student in all_students:
        emb = student.get('face_embedding')
        if emb:
            dist = np.linalg.norm(np.array(emb) - np.array(face_emb))
            if dist <= threshold:
                return student
    return None


def validate_registration_fields(username, name, password):
    """Check that required registration fields are non-empty.

    Returns
    -------
    tuple[bool, str | None]
        ``(True, None)`` when valid, ``(False, error_message)`` otherwise.
    """
    if not username or not name or not password:
        return False, "All Fields are required!"
    return True, None


def validate_password(password, password_confirm):
    """Check password match and strength requirements.

    Returns
    -------
    tuple[bool, str | None]
        ``(True, None)`` when valid, ``(False, error_message)`` otherwise.
    """
    if password != password_confirm:
        return False, "Password doesn't match"

    if len(password) < 8:
        return False, "Password must be at least 8 characters long!"
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one digit!"
    if not any(char.isupper() for char in password):
        return False, "Password must contain at least one uppercase letter!"
    if not any(char.islower() for char in password):
        return False, "Password must contain at least one lowercase letter!"

    return True, None
