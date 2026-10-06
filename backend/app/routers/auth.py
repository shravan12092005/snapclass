"""Authentication routes — teacher login/register, student face-login/register, logout.

Routes are thin wrappers: they call service functions and return safe response models.
Face-login lockout storage is NOT implemented — awaiting design decision.
"""

import io

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile
from PIL import Image, ImageOps

from app.auth import create_session, destroy_session, require_student, require_teacher
from app.models.auth import (
    MessageResponse,
    StudentLoginResponse,
    StudentResponse,
    TeacherLoginRequest,
    TeacherLoginResponse,
    TeacherRegisterRequest,
    TeacherResponse,
)
from app.services.auth_helpers import (
    check_duplicate_face,
    face_login_decision,
    validate_password,
    validate_registration_fields,
)
from app.services.db import (
    check_teacher_exists,
    create_student,
    create_teacher,
    get_all_students,
    get_student_by_id,
    teacher_login,
)
from app.services.face_pipeline import get_face_embeddings, predict_attendance, train_classifier

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Upload limits
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}


# ---------------------------------------------------------------------------
# Teacher
# ---------------------------------------------------------------------------

@router.post("/teacher/login", response_model=TeacherLoginResponse)
def teacher_login_route(req: TeacherLoginRequest, response: Response):
    if not req.username or not req.password:
        raise HTTPException(400, "Username and password required")

    teacher = teacher_login(req.username, req.password)
    if not teacher:
        raise HTTPException(401, "Invalid username and password combo")

    create_session(response, "teacher", teacher["teacher_id"])
    return TeacherLoginResponse(
        message="welcome back!",
        user=TeacherResponse(
            teacher_id=teacher["teacher_id"],
            username=teacher["username"],
            name=teacher["name"],
        ),
    )


@router.post("/teacher/register", response_model=MessageResponse)
def teacher_register_route(req: TeacherRegisterRequest, response: Response):
    # Preserve exact validation order from Streamlit app
    valid, error = validate_registration_fields(req.username, req.name, req.password)
    if not valid:
        raise HTTPException(400, error)

    if check_teacher_exists(req.username):
        raise HTTPException(409, "Username already taken")

    valid, error = validate_password(req.password, req.password_confirm)
    if not valid:
        raise HTTPException(400, error)

    result = create_teacher(req.username, req.password, req.name)
    if not result:
        raise HTTPException(500, "Could not create account. Please try again.")

    return MessageResponse(message="Successfully Created! Login Now")


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------

@router.post("/student/face-login", response_model=StudentLoginResponse)
async def student_face_login_route(
    request: Request, response: Response, image: UploadFile = File(...)
):
    """Authenticate a student via face recognition.

    NOTE: Face-login lockout storage is NOT implemented.
    Ask the user before implementing lockout backend storage.
    """
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Only JPEG/PNG images accepted")

    img_bytes = await image.read()
    if len(img_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(413, "Image too large (max 10 MB)")

    img = ImageOps.exif_transpose(Image.open(io.BytesIO(img_bytes)))
    img_np = np.array(img.convert("RGB"))

    detected, _, num_faces = predict_attendance(img_np, login_mode=True)
    decision = face_login_decision(detected, num_faces)

    if decision[0] == "no_face":
        raise HTTPException(400, "No face detected in the image")
    elif decision[0] == "multi_face":
        raise HTTPException(400, "Multiple faces detected — use a single-person photo")
    elif decision[0] == "not_recognized":
        raise HTTPException(401, "Face not recognized")
    elif decision[0] == "recognized":
        student_id = decision[1]
        student = get_student_by_id(student_id)
        if not student:
            raise HTTPException(401, "Student record not found")

        create_session(response, "student", student_id)
        return StudentLoginResponse(
            message=f"Welcome Back {student['name']}",
            user=StudentResponse(student_id=student["student_id"], name=student["name"]),
        )


@router.post("/student/register", response_model=StudentLoginResponse)
async def student_register_route(
    request: Request,
    response: Response,
    name: str = Form(...),
    consent: bool = Form(...),
    image: UploadFile = File(...),
    audio: UploadFile | None = File(None),
):
    """Register a new student with face (required) and voice (optional)."""
    if not consent:
        raise HTTPException(400, "Biometric consent required")
    if not name.strip():
        raise HTTPException(400, "Name is required")
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Only JPEG/PNG images accepted")

    img_bytes = await image.read()
    if len(img_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(413, "Image too large (max 10 MB)")

    img = ImageOps.exif_transpose(Image.open(io.BytesIO(img_bytes)))
    img_np = np.array(img.convert("RGB"))

    encodings = get_face_embeddings(img_np)
    if not encodings:
        raise HTTPException(400, "Could not capture facial features. Please try again.")
    face_emb = encodings[0].tolist()

    all_students = get_all_students()
    duplicate = check_duplicate_face(face_emb, all_students)
    if duplicate:
        raise HTTPException(
            409,
            f"A student matching this face is already registered (Name: {duplicate['name']}). Please log in instead.",
        )

    voice_emb = None
    if audio:
        from app.audio_convert import convert_to_wav
        from app.services.voice_pipeline import get_voice_embedding

        audio_bytes = await audio.read()
        wav_bytes = convert_to_wav(audio_bytes, audio.content_type or "audio/webm")
        voice_emb = get_voice_embedding(wav_bytes)

    result = create_student(name.strip(), face_embedding=face_emb, voice_embedding=voice_emb)
    if not result:
        raise HTTPException(500, "Failed to create profile")

    train_classifier()
    student = result[0]
    create_session(response, "student", student["student_id"])

    return StudentLoginResponse(
        message=f"Profile Created! Hi {name.strip()}!",
        user=StudentResponse(student_id=student["student_id"], name=student["name"]),
    )


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

@router.post("/logout", response_model=MessageResponse)
def logout_route(response: Response):
    destroy_session(response)
    return MessageResponse(message="Logged out")
