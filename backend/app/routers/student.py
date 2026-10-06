"""Student dashboard and profile routes.

Student ID derived from session cookie only.
"""

from fastapi import APIRouter, HTTPException, Request

from app.auth import require_student
from app.models.attendance import StudentDashboardResponse, StudentDashboardSubject, StudentResponseRef
from app.models.auth import MessageResponse
from app.services.db import (
    delete_student,
    get_student_by_id,
    get_student_dashboard_data,
    unenroll_student_to_subject,
)
from app.services.face_pipeline import train_classifier

router = APIRouter(prefix="/api/student", tags=["student"])


@router.get("/dashboard", response_model=StudentDashboardResponse)
def student_dashboard_route(request: Request):
    student_id = require_student(request)

    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(404, "Student not found")

    dashboard_data = get_student_dashboard_data(student_id)

    subjects = []
    for node in (dashboard_data or []):
        sub = node["subjects"]
        logs = sub.get("attendance_logs", [])

        total = len(logs)
        attended = sum(1 for log in logs if log.get("is_present"))
        rate = (attended / total * 100) if total > 0 else 0.0

        subjects.append(
            StudentDashboardSubject(
                subject_id=sub["subject_id"],
                subject_code=sub["subject_code"],
                name=sub["name"],
                section=sub["section"],
                total=total,
                attended=attended,
                rate=round(rate, 1),
            )
        )

    return StudentDashboardResponse(
        student=StudentResponseRef(student_id=student["student_id"], name=student["name"]),
        subjects=subjects,
    )


@router.delete("/profile", response_model=MessageResponse)
def delete_profile_route(request: Request):
    student_id = require_student(request)

    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(404, "Student not found")

    delete_student(student_id)
    train_classifier()
    return MessageResponse(message="Profile deleted")
