FROM python:3.11-slim

# Install system dependencies:
# - ffmpeg: audio format conversion for browser voice recordings
# - build-essential, cmake, libopenblas-dev: dlib compilation
# - libgl1, libglib2.0-0, libsm6, libxext6, libxrender-dev: OpenCV headless operation
# - git: needed for git-based pip requirements (face_recognition_models)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        build-essential \
        cmake \
        libopenblas-dev \
        libgl1 \
        libglib2.0-0 \
        git \
        libsm6 \
        libxext6 \
        libxrender-dev && \
    rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first to prevent downloading large CUDA wheels
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch torchaudio

# Install Python requirements
WORKDIR /tmp/build
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && rm -rf /tmp/build

# Create non-root user (UID 1000 required for Hugging Face Spaces)
RUN useradd -m -u 1000 user && \
    chmod 1777 /tmp

# Switch to non-root user and set up workspace
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PORT=7860

WORKDIR /home/user/app

# Copy application source owned by non-root user
COPY --chown=user:user . /home/user/app

EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
