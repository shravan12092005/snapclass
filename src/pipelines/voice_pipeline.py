import numpy as np 
import io
import streamlit as st

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
        st.toast("💡 Voice registration simulation active (packages not installed)", icon="🎙️")
        # Return a mock 256D normalized vector
        vec = np.random.uniform(-1.0, 1.0, 256)
        normalized_vec = (vec / np.linalg.norm(vec)).tolist()
        return normalized_vec
    try:
        encoder = load_voice_encoder()

        audio, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000)
        wav = preprocess_wav(audio)
        embedding = encoder.embed_utterance(wav)
        return embedding.tolist()
    except Exception as e:
        st.error('Voice recog error')
        return None
    

def identify_speaker(new_embedding, candidates_dict, threshold=0.65):
    if new_embedding is None or not candidates_dict:
        return None, 0.0
    
    best_sid = None
    best_score = -1.0

    for sid, stored_embedding in candidates_dict.items():
        if stored_embedding:
            similarity = np.dot(new_embedding, stored_embedding)
            if similarity> best_score:
                best_score = similarity
                best_sid = sid

    if best_score >= threshold:
        return best_sid, best_score
    
    return None, best_score



def process_bulk_audio(audio_bytes, candidates_dict, threshold=0.65):
    if not VOICE_AVAILABLE:
        st.info("💡 Running in Voice Simulation Mode (heavy ML packages are not installed on this server).")
        import random
        student_ids = list(candidates_dict.keys())
        if not student_ids:
            return {}
        # Randomly select a subset of students to be present (e.g. 50% to 100% of them)
        num_present = random.randint(max(1, len(student_ids) // 2), len(student_ids))
        present_ids = random.sample(student_ids, num_present)
        return {sid: random.uniform(threshold + 0.05, 0.95) for sid in present_ids}
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
        st.error('Bulk process error')
        return {}