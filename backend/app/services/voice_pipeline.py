import os
import numpy as np 
import io
from app.compat import st
from app.services.logger import logger

DEFAULT_VOICE_THRESHOLD = float(os.getenv("VOICE_SIMILARITY_THRESHOLD", "0.58"))

try:
    from resemblyzer import VoiceEncoder, preprocess_wav
    import librosa
    VOICE_AVAILABLE = True
except ImportError:
    VOICE_AVAILABLE = False



@st.cache_resource
def load_voice_encoder():
    if not VOICE_AVAILABLE:
        return None
    return VoiceEncoder()


def get_voice_embedding(audio_bytes):
    if not VOICE_AVAILABLE:
        st.error("Voice recognition is unavailable (resemblyzer or librosa packages are not installed).")
        return None
    try:
        encoder = load_voice_encoder()

        audio, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000)
        wav = preprocess_wav(audio)
        embedding = encoder.embed_utterance(wav)
        return embedding.tolist()
    except Exception as e:
        import traceback
        st.error(f"Voice recognition error: {str(e)}")
        logger.error(f"Voice recognition exception:\n{traceback.format_exc()}")
        return None
    

def identify_speaker(new_embedding, candidates_dict, threshold=None):
    if threshold is None:
        threshold = DEFAULT_VOICE_THRESHOLD
    if new_embedding is None or not candidates_dict:
        return None, 0.0
    
    best_sid = None
    best_score = -1.0

    # Explicitly L2-normalize the query embedding
    new_emb_np = np.array(new_embedding)
    new_norm = np.linalg.norm(new_emb_np)
    if new_norm > 1e-8:
        new_emb_np = new_emb_np / new_norm

    for sid, stored_embedding in candidates_dict.items():
        if stored_embedding:
            # Explicitly L2-normalize the stored candidate embedding
            stored_emb_np = np.array(stored_embedding)
            stored_norm = np.linalg.norm(stored_emb_np)
            if stored_norm > 1e-8:
                stored_emb_np = stored_emb_np / stored_norm

            similarity = float(np.dot(new_emb_np, stored_emb_np))
            if similarity > best_score:
                best_score = similarity
                best_sid = sid

    if best_score >= threshold:
        return best_sid, best_score
    
    return None, best_score



def process_bulk_audio(audio_bytes, candidates_dict, threshold=None):
    if threshold is None:
        threshold = DEFAULT_VOICE_THRESHOLD

    if not VOICE_AVAILABLE:
        st.error("Voice recognition is unavailable (resemblyzer or librosa packages are not installed).")
        return {}
    try:
        encoder = load_voice_encoder()

        audio, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000)
        duration = len(audio) / sr if sr > 0 else 0.0
        peak_amp = float(np.max(np.abs(audio))) if len(audio) > 0 else 0.0

        logger.info(
            f"[voice_pipeline] Audio received: {duration:.2f}s, peak_amp={peak_amp:.4f}, "
            f"{len(candidates_dict)} candidate(s) (IDs: {list(candidates_dict.keys())}), threshold={threshold:.2f}"
        )

        if duration < 0.2:
            logger.warning("[voice_pipeline] Audio duration is too short (< 0.2s).")
            return {}

        # 1. Voice activity segmentation using top_db=40 (more forgiving than 30)
        segments = librosa.effects.split(audio, top_db=40)
        # Keep segments >= 250ms (captures 'Here', 'Present', names)
        valid_segments = [s for s in segments if (s[1] - s[0]) >= sr * 0.25]

        # 2. If silence splitting returned no valid segments, fallback to analyzing full clip
        if not valid_segments:
            logger.info("[voice_pipeline] No distinct split segments >= 0.25s; evaluating full audio clip.")
            valid_segments = [(0, len(audio))]

        identified_results = {}

        for idx, (start, end) in enumerate(valid_segments):
            seg_len = (end - start) / sr
            segment_audio = audio[start:end]
            wav = preprocess_wav(segment_audio)
            if len(wav) < 160:
                continue

            embedding = encoder.embed_utterance(wav)
            sid, score = identify_speaker(embedding, candidates_dict, threshold)

            logger.info(
                f"[voice_pipeline] Segment {idx+1}/{len(valid_segments)} "
                f"({start/sr:.2f}s - {end/sr:.2f}s, len={seg_len:.2f}s): "
                f"best_sid={sid}, similarity={score:.4f} (threshold={threshold:.2f})"
            )

            if sid:
                if sid not in identified_results or score > identified_results[sid]:
                    identified_results[sid] = score

        logger.info(f"[voice_pipeline] Identified results: {identified_results}")
        return identified_results
    except Exception as e:
        import traceback
        st.error(f"Bulk audio processing error: {str(e)}")
        logger.error(f"Bulk audio processing exception:\n{traceback.format_exc()}")
        return {}