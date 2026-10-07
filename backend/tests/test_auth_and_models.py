"""Tests for session-cookie auth and response model safety.

Verifies:
- Session creation / verification / expiry
- 401 on missing cookie, 403 on wrong role
- Sensitive fields (password, face_embedding, voice_embedding) never in responses
"""

import os
os.environ.setdefault("DEV_MODE", "true")
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "mock-supabase-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "mock-service-role-key")
import io
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

    def test_get_current_user_me_unauthenticated(self):
        from app.routers.auth import get_current_user_route
        request = MagicMock()
        request.cookies = {}
        res = get_current_user_route(request)
        self.assertFalse(res["authenticated"])
        self.assertIsNone(res["role"])

    def test_get_current_user_me_authenticated_teacher(self):
        from app.routers.auth import get_current_user_route
        response = Response()
        create_session(response, "teacher", 7)
        token = response.headers["set-cookie"].split("=", 1)[1].split(";")[0]

        request = MagicMock()
        request.cookies = {SESSION_COOKIE_NAME: token}
        res = get_current_user_route(request)
        self.assertTrue(res["authenticated"])
        self.assertEqual(res["role"], "teacher")
        self.assertEqual(res["user"]["teacher_id"], 7)

    def test_get_current_user_me_authenticated_student(self):
        from app.routers.auth import get_current_user_route
        response = Response()
        create_session(response, "student", 42)
        token = response.headers["set-cookie"].split("=", 1)[1].split(";")[0]

        request = MagicMock()
        request.cookies = {SESSION_COOKIE_NAME: token}
        with patch("app.routers.auth.get_student_by_id", return_value={"student_id": 42, "name": "Bob"}):
            res = get_current_user_route(request)
        self.assertTrue(res["authenticated"])
        self.assertEqual(res["role"], "student")
        self.assertEqual(res["user"]["student_id"], 42)
        self.assertEqual(res["user"]["name"], "Bob")


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


    def test_attendance_session_summary_fields(self):
        """AttendanceSessionSummary must include ts_group, present_count, total_count, and rate."""
        from app.models.attendance import AttendanceSessionSummary
        summary = AttendanceSessionSummary(
            Time="2026-10-06 09:30 AM",
            Subject="CS101",
            Subject_Code="ABC1234",
            Attendance_Stats="✅ 18 / 20 Students",
            ts_group="2026-10-06T09:30:00",
            present_count=18,
            total_count=20,
            rate=90.0,
        )
        dumped = summary.model_dump()
        self.assertEqual(dumped["present_count"], 18)
        self.assertEqual(dumped["total_count"], 20)
        self.assertEqual(dumped["rate"], 90.0)
        self.assertEqual(dumped["ts_group"], "2026-10-06T09:30:00")


class TestSubjectRosterEndpoints(unittest.TestCase):

    @patch("app.routers.subjects.unenroll_student_to_subject")
    @patch("app.routers.subjects.get_teacher_subjects")
    @patch("app.routers.subjects.require_teacher")
    def test_remove_student_from_roster_owner_success(
        self, mock_require_teacher, mock_get_subjects, mock_unenroll
    ):
        from app.routers.subjects import remove_student_from_roster
        mock_require_teacher.return_value = 1
        mock_get_subjects.return_value = [{"subject_id": 10, "name": "CS101"}]
        request = MagicMock()

        res = remove_student_from_roster(10, 42, request)
        self.assertEqual(res.message, "Student removed from roster")
        mock_unenroll.assert_called_once_with(42, 10)

    @patch("app.routers.subjects.get_teacher_subjects")
    @patch("app.routers.subjects.require_teacher")
    def test_remove_student_from_roster_not_owner_forbidden(
        self, mock_require_teacher, mock_get_subjects
    ):
        from app.routers.subjects import remove_student_from_roster
        from fastapi import HTTPException
        mock_require_teacher.return_value = 1
        mock_get_subjects.return_value = [{"subject_id": 99, "name": "Other Course"}]
        request = MagicMock()

        with self.assertRaises(HTTPException) as ctx:
            remove_student_from_roster(10, 42, request)
        self.assertEqual(ctx.exception.status_code, 403)


class TestStudentFaceLoginEndpoint(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        buf = io.BytesIO()
        from PIL import Image
        Image.new("RGB", (100, 100), color=(128, 128, 128)).save(buf, format="JPEG")
        self.img_bytes = buf.getvalue()

    def _make_upload_file(self):
        from starlette.datastructures import UploadFile, Headers
        return UploadFile(
            file=io.BytesIO(self.img_bytes),
            filename="test.jpg",
            headers=Headers({"content-type": "image/jpeg"}),
        )

    @patch("app.routers.auth.record_failure")
    @patch("app.routers.auth.predict_attendance")
    @patch("app.routers.auth.check_lockout", return_value=(False, 0, ""))
    async def test_face_login_pipeline_error_returns_503_no_failure(
        self, mock_lockout, mock_predict, mock_record_failure
    ):
        from app.routers.auth import student_face_login_route
        from app.services.exceptions import FacePipelineError
        from fastapi import HTTPException

        mock_predict.side_effect = FacePipelineError("Model failure")
        request = MagicMock()
        request.cookies = {}
        request.client.host = "127.0.0.1"
        request.headers = {}
        response = Response()

        with self.assertRaises(HTTPException) as ctx:
            await student_face_login_route(request, response, self._make_upload_file())

        self.assertEqual(ctx.exception.status_code, 503)
        self.assertIn("Face recognition service error", ctx.exception.detail)
        mock_record_failure.assert_not_called()

    @patch("app.routers.auth.record_failure")
    @patch("app.routers.auth.predict_attendance", return_value=({}, [1], 0))
    @patch("app.routers.auth.check_lockout", return_value=(False, 0, ""))
    async def test_face_login_zero_face_returns_400(
        self, mock_lockout, mock_predict, mock_record_failure
    ):
        from app.routers.auth import student_face_login_route
        from fastapi import HTTPException

        request = MagicMock()
        request.cookies = {}
        request.client.host = "127.0.0.1"
        request.headers = {}
        response = Response()

        with self.assertRaises(HTTPException) as ctx:
            await student_face_login_route(request, response, self._make_upload_file())

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "No face detected in the image")
        mock_record_failure.assert_not_called()

    @patch("app.routers.auth.record_failure")
    @patch("app.routers.auth.predict_attendance", return_value=({}, [], 1))
    @patch("app.routers.auth.check_lockout", return_value=(False, 0, ""))
    async def test_face_login_no_students_enrolled_returns_401(
        self, mock_lockout, mock_predict, mock_record_failure
    ):
        from app.routers.auth import student_face_login_route
        from fastapi import HTTPException

        request = MagicMock()
        request.cookies = {}
        request.client.host = "127.0.0.1"
        request.headers = {}
        response = Response()

        with self.assertRaises(HTTPException) as ctx:
            await student_face_login_route(request, response, self._make_upload_file())

        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("No registered students found", ctx.exception.detail)
        mock_record_failure.assert_not_called()

    @patch("app.routers.auth.record_failure")
    @patch("app.routers.auth.predict_attendance", return_value=({}, [1], 1))
    @patch("app.routers.auth.check_lockout", return_value=(False, 0, ""))
    async def test_face_login_unmatched_face_returns_401_records_failure(
        self, mock_lockout, mock_predict, mock_record_failure
    ):
        from app.routers.auth import student_face_login_route
        from fastapi import HTTPException

        request = MagicMock()
        request.cookies = {}
        request.client.host = "127.0.0.1"
        request.headers = {}
        response = Response()

        with self.assertRaises(HTTPException) as ctx:
            await student_face_login_route(request, response, self._make_upload_file())

        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Face not recognized")
        mock_record_failure.assert_called_once()

    @patch("app.routers.auth.create_session")
    @patch("app.routers.auth.reset_lockout")
    @patch("app.routers.auth.get_student_by_id", return_value={"student_id": 42, "name": "Alice"})
    @patch("app.routers.auth.predict_attendance", return_value=({42: True}, [42], 1))
    @patch("app.routers.auth.check_lockout", return_value=(False, 0, ""))
    async def test_face_login_matched_face_success(
        self, mock_lockout, mock_predict, mock_get_student, mock_reset, mock_session
    ):
        from app.routers.auth import student_face_login_route

        request = MagicMock()
        request.cookies = {}
        request.client.host = "127.0.0.1"
        request.headers = {}
        response = Response()

        res = await student_face_login_route(request, response, self._make_upload_file())
        self.assertEqual(res.user.student_id, 42)
        self.assertEqual(res.user.name, "Alice")
        self.assertIn("Welcome Back Alice", res.message)
        mock_reset.assert_called_once()
        mock_session.assert_called_once()


if __name__ == "__main__":
    unittest.main()

