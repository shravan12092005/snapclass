"""Enrollment routes — student enroll/unenroll.

Student ID derived from session cookie only.
"""

from fastapi import APIRouter, HTTPException, Request

from app.auth import require_student
from app.models.attendance import EnrollRequest
from app.models.auth import MessageResponse
from app.services.db import (
    check_enrollment,
    enroll_student_to_subject,
    lookup_subject_by_code,
    unenroll_student_to_subject,
)

router = APIRouter(prefix="/api/enrollment", tags=["enrollment"])


@router.post("", response_model=MessageResponse)
@router.post("/", response_model=MessageResponse)
def enroll_route(req: EnrollRequest, request: Request):
    student_id = require_student(request)

    if not req.subject_code or not req.subject_code.strip():
        raise HTTPException(400, "Please enter a subject code")

    subject = lookup_subject_by_code(req.subject_code.strip())
    if subject is None:
        raise HTTPException(404, "Subject code not found. Please check and try again.")

    if check_enrollment(student_id, subject["subject_id"]):
        raise HTTPException(409, "You are already enrolled in this program")

    enroll_student_to_subject(student_id, subject["subject_id"])
    return MessageResponse(message="Successfully enrolled!")


@router.delete("/{subject_id}", response_model=MessageResponse)
def unenroll_route(subject_id: int, request: Request):
    student_id = require_student(request)

    if not check_enrollment(student_id, subject_id):
        raise HTTPException(404, "Not enrolled in this subject")

    unenroll_student_to_subject(student_id, subject_id)
    return MessageResponse(message="Unenrolled successfully")


@router.post("/auto", response_model=MessageResponse)
def auto_enroll_route(req: EnrollRequest, request: Request):
    """Auto-enroll via join link — same logic as manual enroll."""
    student_id = require_student(request)

    subject = lookup_subject_by_code(req.subject_code.strip())
    if subject is None:
        raise HTTPException(404, "Subject code not found!")

    if check_enrollment(student_id, subject["subject_id"]):
        return MessageResponse(message="You're already enrolled!")

    enroll_student_to_subject(student_id, subject["subject_id"])
    return MessageResponse(message="Joined successfully!")
