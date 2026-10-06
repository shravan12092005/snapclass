"""Pydantic models for attendance endpoints."""

from pydantic import BaseModel


class AttendanceResultEntry(BaseModel):
    Name: str
    ID: int
    Source: str
    Status: str


class AttendanceLogEntry(BaseModel):
    student_id: int
    subject_id: int
    timestamp: str
    is_present: bool


class FaceAttendanceResponse(BaseModel):
    results: list[AttendanceResultEntry]
    logs: list[AttendanceLogEntry]


class VoiceAttendanceResponse(BaseModel):
    results: list[AttendanceResultEntry]
    logs: list[AttendanceLogEntry]
    no_profile_count: int


class SaveAttendanceRequest(BaseModel):
    logs: list[AttendanceLogEntry]


class AttendanceSessionSummary(BaseModel):
    Time: str
    Subject: str
    Subject_Code: str
    Attendance_Stats: str


class AttendanceRecordsResponse(BaseModel):
    sessions: list[AttendanceSessionSummary]


class EnrollRequest(BaseModel):
    subject_code: str


class StudentDashboardSubject(BaseModel):
    subject_id: int
    subject_code: str
    name: str
    section: str
    total: int = 0
    attended: int = 0
    rate: float = 0.0


class StudentDashboardResponse(BaseModel):
    student: "StudentResponseRef"
    subjects: list[StudentDashboardSubject]


class StudentResponseRef(BaseModel):
    """Minimal student reference — no embeddings."""
    student_id: int
    name: str


# Rebuild forward ref
StudentDashboardResponse.model_rebuild()
