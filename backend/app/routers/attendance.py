"""Attendance routes — face analysis, voice analysis, save, records.

Teacher ID derived from session cookie. Ownership checked on every route.
"""

import io
from datetime import datetime

import numpy as np
from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.auth import require_teacher
from app.config import supabase
from app.models.attendance import (
    AttendanceLogEntry,
    AttendanceRecordsResponse,
    AttendanceResultEntry,
    AttendanceSessionSummary,
    FaceAttendanceResponse,
    SaveAttendanceRequest,
    VoiceAttendanceResponse,
)
from app.models.auth import MessageResponse
from app.services.attendance import (
    build_face_attendance_results,
    build_voice_attendance_results,
    separate_voice_candidates,
)
from app.services.db import (
    create_attendance,
    get_attendance_for_teacher,
    get_teacher_subjects,
    safe_execute,
)
from app.services.face_pipeline import predict_attendance
from app.services.voice_pipeline import process_bulk_audio
from PIL import Image, ImageOps

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

MAX_IMAGE_SIZE = 10 * 1024 * 1024   # 10 MB per image
MAX_AUDIO_SIZE = 25 * 1024 * 1024   # 25 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}
ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/wav", "audio/wave", "audio/x-wav", "audio/ogg", "audio/mpeg", "audio/mp3"}


def _verify_subject_ownership(teacher_id: int, subject_id: int):
    """Raise 403 if the teacher does not own the subject."""
    subjects = get_teacher_subjects(teacher_id)
    if not any(s["subject_id"] == subject_id for s in subjects):
        raise HTTPException(403, "You do not own this subject")


@router.post("/face", response_model=FaceAttendanceResponse)
async def face_attendance_route(
    request: Request,
    subject_id: int,
    images: list[UploadFile] = File(...),
):
    teacher_id = require_teacher(request)
    _verify_subject_ownership(teacher_id, subject_id)

    if not images:
        raise HTTPException(400, "At least one image required")

    # Fetch enrolled students
    enrolled_res = safe_execute(
        supabase.table("subject_students")
        .select("*, students(*)")
        .eq("subject_id", subject_id)
    )
    enrolled_students = enrolled_res.data
    if not enrolled_students:
        raise HTTPException(400, "No students enrolled in this course")

    candidate_ids = {
        node["students"]["student_id"]
        for node in enrolled_students
        if node.get("students") and node["students"].get("student_id") is not None
    }

    # Run face detection on each image (same loop as Streamlit app)
    all_detected_ids = {}
    for idx, img_file in enumerate(images):
        if img_file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(400, f"Image {idx+1}: only JPEG/PNG accepted")
        img_bytes = await img_file.read()
        if len(img_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(413, f"Image {idx+1} too large (max 10 MB)")

        img = ImageOps.exif_transpose(Image.open(io.BytesIO(img_bytes)))
        img_np = np.array(img.convert("RGB"))
        detected, _, _ = predict_attendance(img_np, candidate_ids=candidate_ids)

        if detected:
            for sid in detected.keys():
                student_id = int(sid)
                all_detected_ids.setdefault(student_id, []).append(f"Photo {idx+1}")

    current_timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    results, logs = build_face_attendance_results(
        enrolled_students, all_detected_ids, subject_id, current_timestamp
    )

    return FaceAttendanceResponse(
        results=[AttendanceResultEntry(**r) for r in results],
        logs=[AttendanceLogEntry(**log) for log in logs],
    )


@router.post("/voice", response_model=VoiceAttendanceResponse)
async def voice_attendance_route(
    request: Request,
    subject_id: int,
    audio: UploadFile = File(...),
):
    teacher_id = require_teacher(request)
    _verify_subject_ownership(teacher_id, subject_id)

    if audio.content_type and audio.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(400, "Unsupported audio format")

    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(413, "Audio too large (max 25 MB)")

    # Convert browser audio to WAV if needed
    from app.audio_convert import convert_to_wav
    wav_bytes = convert_to_wav(audio_bytes, audio.content_type or "audio/webm")

    enrolled_res = safe_execute(
        supabase.table("subject_students")
        .select("*, students(*)")
        .eq("subject_id", subject_id)
    )
    enrolled_students = enrolled_res.data
    if not enrolled_students:
        raise HTTPException(400, "No students enrolled in this course")

    candidates_dict, no_profile_ids = separate_voice_candidates(enrolled_students)

    if not candidates_dict and not no_profile_ids:
        raise HTTPException(400, "No enrolled students found")

    detected_scores = {}
    if candidates_dict:
        detected_scores = process_bulk_audio(wav_bytes, candidates_dict)

    current_timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    results, logs = build_voice_attendance_results(
        enrolled_students, detected_scores, no_profile_ids,
        subject_id, current_timestamp
    )

    return VoiceAttendanceResponse(
        results=[AttendanceResultEntry(**{**r, "Source": str(r["Source"])}) for r in results],
        logs=[AttendanceLogEntry(**log) for log in logs],
        no_profile_count=len(no_profile_ids),
    )


@router.post("/save", response_model=MessageResponse)
def save_attendance_route(req: SaveAttendanceRequest, request: Request):
    teacher_id = require_teacher(request)

    if not req.logs:
        raise HTTPException(400, "No attendance logs to save")

    # Verify ownership of the subject in the logs
    subject_ids = {log.subject_id for log in req.logs}
    for sid in subject_ids:
        _verify_subject_ownership(teacher_id, sid)

    logs_dicts = [log.model_dump() for log in req.logs]
    create_attendance(logs_dicts)
    return MessageResponse(message="Attendance taken")


@router.get("/records", response_model=AttendanceRecordsResponse)
def get_records_route(request: Request):
    teacher_id = require_teacher(request)

    records = get_attendance_for_teacher(teacher_id)
    if not records:
        return AttendanceRecordsResponse(sessions=[])

    from app.services.records import flatten_attendance_records, aggregate_attendance_sessions
    import pandas as pd

    data = flatten_attendance_records(records)
    df = pd.DataFrame(data)
    summary = aggregate_attendance_sessions(df)

    sessions = [
        AttendanceSessionSummary(
            Time=row["Time"],
            Subject=row["Subject"],
            Subject_Code=row["Subject Code"],
            Attendance_Stats=row["Attendance Stats"],
        )
        for _, row in summary.iterrows()
    ]
    return AttendanceRecordsResponse(sessions=sessions)
