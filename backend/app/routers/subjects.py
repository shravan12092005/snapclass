"""Subject management routes — CRUD for teacher-owned subjects.

Ownership enforced: teachers can only access their own subjects.
"""

from fastapi import APIRouter, HTTPException, Request

from app.auth import require_teacher
from app.models.subjects import (
    CreateSubjectRequest,
    RosterEntry,
    RosterResponse,
    ShareInfoResponse,
    SubjectListResponse,
    SubjectResponse,
)
from app.models.auth import MessageResponse
from app.services.db import (
    create_subject,
    delete_subject,
    get_teacher_subjects,
    lookup_subject_by_code,
    safe_execute,
    unenroll_student_to_subject,
)
from app.services.roster import compute_roster_data
from app.config import supabase

import random
import string

router = APIRouter(prefix="/api/subjects", tags=["subjects"])


def _generate_subject_code(length=7):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def _generate_unique_code(max_retries=10):
    for _ in range(max_retries):
        code = _generate_subject_code()
        try:
            existing = lookup_subject_by_code(code)
        except Exception:
            return code
        if existing is None:
            return code
    return _generate_subject_code(length=8)


@router.get("/", response_model=SubjectListResponse)
def list_subjects(request: Request):
    teacher_id = require_teacher(request)
    subjects = get_teacher_subjects(teacher_id)
    return SubjectListResponse(
        subjects=[
            SubjectResponse(
                subject_id=s["subject_id"],
                subject_code=s["subject_code"],
                name=s["name"],
                section=s["section"],
                teacher_id=s["teacher_id"],
                total_students=s.get("total_students", 0),
                total_classes=s.get("total_classes", 0),
            )
            for s in subjects
        ]
    )


@router.post("/", response_model=SubjectResponse)
def create_subject_route(req: CreateSubjectRequest, request: Request):
    teacher_id = require_teacher(request)
    if not req.name.strip() or not req.section.strip():
        raise HTTPException(400, "Please fill all the fields")

    sub_code = _generate_unique_code()
    result = create_subject(sub_code, req.name, req.section, teacher_id)
    if not result:
        raise HTTPException(500, "Failed to create subject")

    sub = result[0]
    return SubjectResponse(
        subject_id=sub["subject_id"],
        subject_code=sub["subject_code"],
        name=sub["name"],
        section=sub["section"],
        teacher_id=sub["teacher_id"],
    )


@router.delete("/{subject_id}", response_model=MessageResponse)
def delete_subject_route(subject_id: int, request: Request):
    teacher_id = require_teacher(request)

    # Ownership check: verify subject belongs to this teacher
    subjects = get_teacher_subjects(teacher_id)
    owned_ids = {s["subject_id"] for s in subjects}
    if subject_id not in owned_ids:
        raise HTTPException(403, "You do not own this subject")

    delete_subject(subject_id)
    return MessageResponse(message="Subject deleted")


@router.get("/{subject_id}/share", response_model=ShareInfoResponse)
def get_share_info(subject_id: int, request: Request):
    teacher_id = require_teacher(request)

    subjects = get_teacher_subjects(teacher_id)
    sub = next((s for s in subjects if s["subject_id"] == subject_id), None)
    if sub is None:
        raise HTTPException(403, "You do not own this subject")

    origin = request.headers.get("origin", "http://localhost:3000")
    join_url = f"{origin}/?join-code={sub['subject_code']}"

    return ShareInfoResponse(
        subject_name=sub["name"],
        subject_code=sub["subject_code"],
        join_url=join_url,
    )


@router.get("/{subject_id}/roster", response_model=RosterResponse)
def get_roster(subject_id: int, request: Request):
    teacher_id = require_teacher(request)

    # Ownership check
    subjects = get_teacher_subjects(teacher_id)
    if not any(s["subject_id"] == subject_id for s in subjects):
        raise HTTPException(403, "You do not own this subject")

    roster_res = safe_execute(
        supabase.table("subject_students")
        .select("*, students(*)")
        .eq("subject_id", subject_id)
    )
    roster = roster_res.data if roster_res.data else []
    if not roster:
        return RosterResponse(roster=[])

    att_res = safe_execute(
        supabase.table("attendance_logs")
        .select("student_id, is_present")
        .eq("subject_id", subject_id)
    )
    att_logs = att_res.data if att_res.data else []

    roster_data = compute_roster_data(roster, att_logs)
    return RosterResponse(roster=[RosterEntry(**r) for r in roster_data])


@router.delete("/{subject_id}/students/{student_id}", response_model=MessageResponse)
def remove_student_from_roster(subject_id: int, student_id: int, request: Request):
    teacher_id = require_teacher(request)

    # Ownership check
    subjects = get_teacher_subjects(teacher_id)
    if not any(s["subject_id"] == subject_id for s in subjects):
        raise HTTPException(403, "You do not own this subject")

    unenroll_student_to_subject(student_id, subject_id)
    return MessageResponse(message="Student removed from roster")

