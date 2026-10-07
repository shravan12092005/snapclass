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
    from app.services.face_pipeline import load_dlib_models
    from app.services.voice_pipeline import load_voice_encoder
    load_dlib_models()
    load_voice_encoder()
    logger.info("ML models loaded.")
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
