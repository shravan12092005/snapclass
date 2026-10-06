"""Pydantic models for authentication endpoints.

SECURITY: TeacherResponse and StudentResponse explicitly list safe fields.
password, face_embedding, and voice_embedding are NEVER exposed.
"""

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------

class TeacherLoginRequest(BaseModel):
    username: str
    password: str


class TeacherRegisterRequest(BaseModel):
    username: str
    password: str
    password_confirm: str
    name: str


# ---------------------------------------------------------------------------
# Responses — safe fields only
# ---------------------------------------------------------------------------

class TeacherResponse(BaseModel):
    """Teacher data returned to the client. No password hash."""
    teacher_id: int
    username: str
    name: str


class StudentResponse(BaseModel):
    """Student data returned to the client. No embeddings."""
    student_id: int
    name: str


class TeacherLoginResponse(BaseModel):
    message: str
    user: TeacherResponse


class StudentLoginResponse(BaseModel):
    message: str
    user: StudentResponse


class MessageResponse(BaseModel):
    message: str
