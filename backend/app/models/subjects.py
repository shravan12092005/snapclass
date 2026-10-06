"""Pydantic models for subject endpoints."""

from pydantic import BaseModel


class CreateSubjectRequest(BaseModel):
    name: str
    section: str


class SubjectResponse(BaseModel):
    subject_id: int
    subject_code: str
    name: str
    section: str
    teacher_id: int
    total_students: int = 0
    total_classes: int = 0


class SubjectListResponse(BaseModel):
    subjects: list[SubjectResponse]


class ShareInfoResponse(BaseModel):
    subject_name: str
    subject_code: str
    join_url: str


class RosterEntry(BaseModel):
    Name: str
    ID: int
    Attended: str
    Rate: str


class RosterResponse(BaseModel):
    roster: list[RosterEntry]
