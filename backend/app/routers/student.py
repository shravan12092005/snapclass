"""Student dashboard and profile routes.

Student ID derived from session cookie only.
"""

from fastapi import APIRouter, HTTPException, Request, Response

from app.auth import require_student, destroy_session
from app.models.attendance import StudentDashboardResponse, StudentDashboardSubject, StudentResponseRef
from app.models.auth import MessageResponse
from app.services.db import (
    delete_student,
    get_student_by_id,
    get_student_dashboard_data,
    unenroll_student_to_subject,
)
from app.services.face_pipeline import train_classifier
from app.services.records import compute_student_subject_stats

router = APIRouter(prefix="/api/student", tags=["student"])


@router.get("/dashboard", response_model=StudentDashboardResponse)
def student_dashboard_route(request: Request):
    student_id = require_student(request)

    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(404, "Student not found")

    dashboard_data = get_student_dashboard_data(student_id)
    subject_stats = compute_student_subject_stats(dashboard_data)

    subjects = [
        StudentDashboardSubject(
            subject_id=s["subject_id"],
            subject_code=s["subject_code"],
            name=s["name"],
            section=s["section"],
            total=s["total"],
            attended=s["attended"],
            rate=round(s["percentage"], 1),
        )
        for s in subject_stats
    ]

    return StudentDashboardResponse(
        student=StudentResponseRef(student_id=student["student_id"], name=student["name"]),
        subjects=subjects,
    )


@router.delete("/profile", response_model=MessageResponse)
def delete_profile_route(request: Request, response: Response):
    student_id = require_student(request)

    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(404, "Student not found")

    delete_student(student_id)
    destroy_session(response)
    train_classifier()
    return MessageResponse(message="Profile deleted")
