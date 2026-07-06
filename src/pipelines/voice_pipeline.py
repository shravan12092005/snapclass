import numpy as np 
import io
import streamlit as st
from src.utils.logger import logger

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
    

def identify_speaker(new_embedding, candidates_dict, threshold=0.65):
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

            similarity = np.dot(new_emb_np, stored_emb_np)
            if similarity > best_score:
                best_score = similarity
                best_sid = sid

    if best_score >= threshold:
        return best_sid, best_score
    
    return None, best_score



def process_bulk_audio(audio_bytes, candidates_dict, threshold=0.65):
    if not VOICE_AVAILABLE:
        st.error("Voice recognition is unavailable (resemblyzer or librosa packages are not installed).")
        return {}
    try:
        encoder = load_voice_encoder()

        audio, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000)
        segments = librosa.effects.split(audio, top_db=30)

        identified_results = {}


        for start, end in segments:

            if (end-start) < sr * 0.5:
                continue
            segment_audio = audio[start:end]
            wav = preprocess_wav(segment_audio)
            embedding = encoder.embed_utterance(wav)


            sid, score = identify_speaker(embedding, candidates_dict, threshold)

            if sid:
                if sid not in identified_results or score > identified_results[sid]:
                    identified_results[sid] = score

        return identified_results
    except Exception as e:
        import traceback
        st.error(f"Bulk audio processing error: {str(e)}")
        logger.error(f"Bulk audio processing exception:\n{traceback.format_exc()}")
        return {}