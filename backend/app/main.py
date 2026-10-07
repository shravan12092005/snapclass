"""SnapClass FastAPI backend.

- ML models loaded at startup via lifespan
- CORS origins from CORS_ORIGINS env var
- All routes use response_model for safe serialization
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("snapclass")
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")


# ---------------------------------------------------------------------------
# Lifespan — load ML models at startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    dev_mode = os.environ.get("DEV_MODE", "").strip().lower() in ("true", "1", "yes")
    if not dev_mode:
        if not os.environ.get("SESSION_SECRET"):
            raise RuntimeError("SESSION_SECRET environment variable is missing. Refusing to start.")
        if not os.environ.get("LOCKOUT_SECRET"):
            raise RuntimeError("LOCKOUT_SECRET environment variable is missing. Refusing to start.")

    logger.info("Loading ML models at startup…")
    dlib_loaded = "no"
    try:
        from app.services.face_pipeline import load_dlib_models
        load_dlib_models()
        dlib_loaded = "yes"
    except Exception as _e:
        logger.error("dlib model loading failed: %s", _e)
        dlib_loaded = "no"
    logger.info("dlib models loaded: %s", dlib_loaded)

    try:
        from app.services.voice_pipeline import load_voice_encoder
        load_voice_encoder()
    except Exception as _e:
        logger.error("voice encoder loading failed: %s", _e)
    logger.info("ML models loaded.")

    # Startup diagnostics (never log secret values)
    srk = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    logger.info("SUPABASE_SERVICE_ROLE_KEY is %s", "set" if srk else "NOT set")

    try:
        from app.config import supabase as _sb
        _sb.table("login_attempts").select("key_hash").limit(1).execute()
        logger.info("login_attempts table is reachable: yes")
    except Exception as _e:
        logger.warning("login_attempts table is reachable: no (%s)", _e)

    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SnapClass API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — origins from environment
_raw_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,  # required for session cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

from app.routers import auth, subjects, enrollment, attendance, student  # noqa: E402

app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(enrollment.router)
app.include_router(attendance.router)
app.include_router(student.router)


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok"}
