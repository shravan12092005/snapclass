/**
 * Utility functions for client-side audio recording, WAV encoding, and format detection.
 * Ensures cross-browser compatibility (macOS/iOS Safari, Chrome, Firefox, Edge)
 * and seamless interop with SnapClass backend audio processing.
 */

/**
 * Returns the best supported MediaRecorder MIME type for the current browser,
 * or empty string if none / unsupported.
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidateTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/aac",
  ];

  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

/**
 * Downsample Float32Array PCM audio buffer from sourceRate to targetRate (e.g. 16000 Hz).
 * Uses windowed averaging as an anti-aliasing filter.
 */
export function downsampleBuffer(
  buffer: Float32Array,
  sourceRate: number,
  targetRate: number = 16000
): Float32Array {
  if (sourceRate <= targetRate) {
    return buffer;
  }

  const ratio = sourceRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      sum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? sum / count : (buffer[offsetBuffer] || 0);
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

/**
 * Encodes 32-bit floating point PCM audio samples into a standard
 * 16-bit mono RIFF/WAV Blob at the specified sample rate.
 * Universal format natively supported by Safari, Chrome, Firefox, ffmpeg, and librosa.
 */
export function encodeWavBlob(
  samples: Float32Array,
  sampleRate: number = 16000
): Blob {
  const numChannels = 1; // mono
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8; // 2
  const blockAlign = numChannels * bytesPerSample; // 2
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF chunk descriptor */
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(8, "WAVE");

  /* "fmt " sub-chunk */
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1 = mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  /* "data" sub-chunk */
  writeString(36, "data");
  view.setUint32(40, dataSize, true); // Subchunk2Size

  /* Write 16-bit signed PCM samples with clipping prevention */
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

/**
 * Converts any audio Blob (e.g. recorded MP4, WebM, OGG) to a standard 16 kHz mono WAV Blob
 * using the browser's Web Audio API. Returns the original blob if decoding fails.
 */
export async function convertBlobToWav(blob: Blob): Promise<Blob> {
  if (typeof window === "undefined") return blob;
  if (
    blob.type === "audio/wav" ||
    blob.type === "audio/wave" ||
    blob.type === "audio/x-wav"
  ) {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return blob;

    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const downsampled = downsampleBuffer(
      channelData,
      audioBuffer.sampleRate,
      16000
    );
    const wavBlob = encodeWavBlob(downsampled, 16000);
    audioCtx.close().catch(() => {});
    return wavBlob;
  } catch (err) {
    console.warn("Could not transcode blob to WAV, using original format:", err);
    return blob;
  }
}
