"""Convert browser audio (WebM/Opus) to WAV for the voice pipeline.

ffmpeg must be installed (see Dockerfile).
"""

import os
import subprocess
import tempfile


def convert_to_wav(input_bytes: bytes, content_type: str) -> bytes:
    """Convert audio bytes to 16 kHz mono WAV using ffmpeg.

    If the input is already WAV, it is still passed through ffmpeg to
    ensure the correct sample rate and channel count.

    Parameters
    ----------
    input_bytes : bytes
        Raw audio data.
    content_type : str
        MIME type (e.g. ``"audio/webm"``, ``"audio/wav"``).

    Returns
    -------
    bytes
        WAV audio data at 16 kHz, mono, 16-bit PCM.

    Raises
    ------
    RuntimeError
        If ffmpeg conversion fails.
    """
    fmt_map = {
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/wave": "wav",
        "audio/x-wav": "wav",
        "audio/mp3": "mp3",
        "audio/mpeg": "mp3",
    }
    input_fmt = fmt_map.get(content_type, "webm")

    with tempfile.NamedTemporaryFile(suffix=f".{input_fmt}", delete=False) as tmp_in:
        tmp_in.write(input_bytes)
        tmp_in_path = tmp_in.name

    tmp_out_path = tmp_in_path.rsplit(".", 1)[0] + "_out.wav"

    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-f", input_fmt,
                "-i", tmp_in_path,
                "-acodec", "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                tmp_out_path,
            ],
            capture_output=True,
            timeout=30,
        )

        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg conversion failed: {result.stderr.decode()}")

        with open(tmp_out_path, "rb") as f:
            return f.read()
    finally:
        for path in (tmp_in_path, tmp_out_path):
            try:
                os.unlink(path)
            except OSError:
                pass
