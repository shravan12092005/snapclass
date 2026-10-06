"""Tests for audio conversion (WebM/Opus → WAV via ffmpeg)."""

import io
import struct
import unittest
import wave


class TestAudioConvert(unittest.TestCase):

    def _make_wav_bytes(self, sample_rate=44100, duration_ms=100):
        """Generate a minimal WAV file."""
        n_samples = int(sample_rate * duration_ms / 1000)
        samples = [int(32767 * 0.5)] * n_samples
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(struct.pack(f"<{n_samples}h", *samples))
        return buf.getvalue()

    def test_wav_passthrough(self):
        """WAV input should produce 16 kHz mono WAV output."""
        from app.audio_convert import convert_to_wav

        wav_bytes = self._make_wav_bytes(sample_rate=44100)
        result = convert_to_wav(wav_bytes, "audio/wav")

        buf = io.BytesIO(result)
        with wave.open(buf) as wf:
            self.assertEqual(wf.getframerate(), 16000)
            self.assertEqual(wf.getnchannels(), 1)
            self.assertEqual(wf.getsampwidth(), 2)

    def test_invalid_input_raises(self):
        """Garbage input should raise RuntimeError."""
        from app.audio_convert import convert_to_wav

        with self.assertRaises(RuntimeError):
            convert_to_wav(b"not audio data at all", "audio/webm")


if __name__ == "__main__":
    unittest.main()
