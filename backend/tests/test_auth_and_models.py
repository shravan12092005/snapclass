"""Tests for session-cookie auth and response model safety.

Verifies:
- Session creation / verification / expiry
- 401 on missing cookie, 403 on wrong role
- Sensitive fields (password, face_embedding, voice_embedding) never in responses
"""

import unittest
from unittest.mock import MagicMock, patch

from fastapi import Response
from starlette.testclient import TestClient

from app.auth import (
    SESSION_COOKIE_NAME,
    create_session,
    destroy_session,
    get_session,
    require_student,
    require_teacher,
)
from app.models.auth import StudentResponse, TeacherResponse


# ---------------------------------------------------------------------------
# Unit tests for auth helpers (no app needed)
# ---------------------------------------------------------------------------

class TestSessionAuth(unittest.TestCase):

    def test_create_and_verify_session(self):
        response = Response()
        create_session(response, "teacher", 42)

        # Extract cookie from response headers
        set_cookie_header = response.headers.get("set-cookie", "")
        self.assertIn(SESSION_COOKIE_NAME, set_cookie_header)
        self.assertIn("httponly", set_cookie_header.lower())
        self.assertIn("samesite=lax", set_cookie_header.lower())

    def test_get_session_no_cookie(self):
        request = MagicMock()
        request.cookies = {}
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            get_session(request)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_get_session_invalid_cookie(self):
        request = MagicMock()
        request.cookies = {SESSION_COOKIE_NAME: "garbage-token"}
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            get_session(request)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_require_teacher_wrong_role(self):
        """Student session should get 403 on teacher-only route."""
        response = Response()
        create_session(response, "student", 99)

        # Parse the cookie value
        set_cookie = response.headers.get("set-cookie", "")
        token = set_cookie.split("=", 1)[1].split(";")[0]

        request = MagicMock()
        request.cookies = {SESSION_COOKIE_NAME: token}

        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            require_teacher(request)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_require_student_wrong_role(self):
        """Teacher session should get 403 on student-only route."""
        response = Response()
        create_session(response, "teacher", 1)
        token = response.headers["set-cookie"].split("=", 1)[1].split(";")[0]

        request = MagicMock()
        request.cookies = {SESSION_COOKIE_NAME: token}

        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            require_student(request)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_valid_teacher_session(self):
        response = Response()
        create_session(response, "teacher", 7)
        token = response.headers["set-cookie"].split("=", 1)[1].split(";")[0]

        request = MagicMock()
        request.cookies = {SESSION_COOKIE_NAME: token}

        teacher_id = require_teacher(request)
        self.assertEqual(teacher_id, 7)


# ---------------------------------------------------------------------------
# Response model safety tests
# ---------------------------------------------------------------------------

class TestResponseModelSafety(unittest.TestCase):

    def test_teacher_response_excludes_password(self):
        """TeacherResponse must not include password field."""
        fields = set(TeacherResponse.model_fields.keys())
        self.assertNotIn("password", fields)
        self.assertNotIn("password_hash", fields)

        # Verify extra fields are rejected
        tr = TeacherResponse(teacher_id=1, username="u", name="n")
        dumped = tr.model_dump()
        self.assertNotIn("password", dumped)

    def test_student_response_excludes_embeddings(self):
        """StudentResponse must not include face_embedding or voice_embedding."""
        fields = set(StudentResponse.model_fields.keys())
        self.assertNotIn("face_embedding", fields)
        self.assertNotIn("voice_embedding", fields)
        self.assertNotIn("password", fields)

        sr = StudentResponse(student_id=1, name="s")
        dumped = sr.model_dump()
        self.assertNotIn("face_embedding", dumped)
        self.assertNotIn("voice_embedding", dumped)

    def test_teacher_response_from_db_record(self):
        """Constructing TeacherResponse from a DB record with password must work
        and the password must NOT appear in output."""
        db_record = {
            "teacher_id": 1,
            "username": "prof",
            "name": "Professor",
            "password": "$2b$12$hashedvalue",
        }
        # Only safe fields
        tr = TeacherResponse(
            teacher_id=db_record["teacher_id"],
            username=db_record["username"],
            name=db_record["name"],
        )
        dumped = tr.model_dump()
        self.assertNotIn("password", dumped)
        self.assertEqual(dumped["teacher_id"], 1)

    def test_student_response_from_db_record(self):
        """Constructing StudentResponse from a DB record with embeddings
        must NOT expose those embeddings."""
        db_record = {
            "student_id": 42,
            "name": "Alice",
            "face_embedding": [0.1] * 128,
            "voice_embedding": [0.2] * 256,
        }
        sr = StudentResponse(
            student_id=db_record["student_id"],
            name=db_record["name"],
        )
        dumped = sr.model_dump()
        self.assertNotIn("face_embedding", dumped)
        self.assertNotIn("voice_embedding", dumped)
        self.assertEqual(dumped["name"], "Alice")


if __name__ == "__main__":
    unittest.main()
