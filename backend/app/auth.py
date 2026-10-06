"""Session-based authentication using signed httpOnly cookies.

Uses ``itsdangerous`` to sign/verify session payloads.
User IDs are derived from the session only — never from client input.
"""

import os

from fastapi import HTTPException, Request, Response
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

SESSION_SECRET = os.environ.get("SESSION_SECRET", "CHANGE-ME-dev-only-secret")
SESSION_MAX_AGE = 86400 * 7  # 7 days
SESSION_COOKIE_NAME = "snapclass_session"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() in ("true", "1", "yes")

_serializer = URLSafeTimedSerializer(SESSION_SECRET)


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------

def create_session(response: Response, user_type: str, user_id: int):
    """Set a signed session cookie on *response*."""
    payload = {"type": user_type, "id": user_id}
    token = _serializer.dumps(payload)
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=SESSION_MAX_AGE,
        path="/",
    )


def destroy_session(response: Response):
    """Clear the session cookie."""
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")


def get_session(request: Request) -> dict:
    """Extract and verify the session from the cookie.

    Returns
    -------
    dict
        ``{"type": "teacher"|"student", "id": <int>}``

    Raises
    ------
    HTTPException(401)
        If no cookie or signature is invalid/expired.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = _serializer.loads(token, max_age=SESSION_MAX_AGE)
        return payload
    except (BadSignature, SignatureExpired):
        raise HTTPException(status_code=401, detail="Invalid or expired session")


def require_teacher(request: Request) -> int:
    """Return the teacher_id from session, or raise 403."""
    session = get_session(request)
    if session.get("type") != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return session["id"]


def require_student(request: Request) -> int:
    """Return the student_id from session, or raise 403."""
    session = get_session(request)
    if session.get("type") != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return session["id"]
