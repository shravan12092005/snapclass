"use client";

import React, { useRef, useState, useEffect } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Upload, Volume2 } from "lucide-react";
import {
  encodeWavBlob,
  downsampleBuffer,
  getSupportedAudioMimeType,
} from "@/lib/audioUtils";

interface VoiceRecorderProps {
  onAudioReady: (blob: Blob | null) => void;
  title?: string;
  subtitle?: string;
}

export default function VoiceRecorder({
  onAudioReady,
  title = "Optional Voice Profile",
  subtitle = "Record a 3-5 second voice sample for multi-modal biometric attendance",
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep audioUrlRef in sync for cleanup
  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (processorRef.current) {
        try {
          processorRef.current.disconnect();
        } catch {}
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      ctx.fillStyle = "#4F46E5";
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }

    if (isRecordingRef.current) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  };

  const startRecording = async () => {
    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      audioChunksRef.current = [];
      pcmChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Web Audio API visualizer
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      isRecordingRef.current = true;

      // Direct PCM capture via ScriptProcessor for universal cross-browser WAV creation
      if (audioCtx.createScriptProcessor) {
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          if (!isRecordingRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          pcmChunksRef.current.push(new Float32Array(input));
        };
        source.connect(processor);

        // Connect to a muted gain node to keep processor running without audio loopback
        const muteNode = audioCtx.createGain();
        muteNode.gain.value = 0;
        processor.connect(muteNode);
        muteNode.connect(audioCtx.destination);
        processorRef.current = processor;
      }

      // MediaRecorder fallback in parallel
      const mimeType = getSupportedAudioMimeType();
      try {
        const mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        mediaRecorder.start();
      } catch {
        // MediaRecorder might fail in unusual environments; ScriptProcessor will still capture
      }

      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      drawWaveform();
    } catch (err) {
      console.warn("Microphone access failed:", err);
      alert("Microphone permission denied or not supported. You can upload an audio sample below.");
    }
  };

  const stopRecording = () => {
    if (!isRecordingRef.current && !isRecording) return;
    isRecordingRef.current = false;
    setIsRecording(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    const audioCtx = audioContextRef.current;
    const pcmChunks = pcmChunksRef.current;
    const totalSamples = pcmChunks.reduce((acc, c) => acc + c.length, 0);

    let audioBlob: Blob | null = null;

    if (totalSamples > 0 && audioCtx) {
      const merged = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of pcmChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      // Encode downsampled 16 kHz mono WAV (fully supported by Safari, Chrome, and backend)
      const downsampled = downsampleBuffer(merged, audioCtx.sampleRate, 16000);
      audioBlob = encodeWavBlob(downsampled, 16000);
    } else if (audioChunksRef.current.length > 0) {
      const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
      audioBlob = new Blob(audioChunksRef.current, { type: mime });
    }

    // Clean up nodes and tracks
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {}
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      onAudioReady(audioBlob);
    }
  };

  const resetRecording = () => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch {}
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
    pcmChunksRef.current = [];
    onAudioReady(null);
  };

  const togglePlayback = () => {
    const player = audioPlayerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      if (player.ended || player.currentTime >= player.duration) {
        player.currentTime = 0;
      }
      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn("Audio playback error:", err);
            setIsPlaying(false);
          });
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setIsPlaying(false);
      onAudioReady(file);
    }
  };

  return (
    <div className="w-full flex flex-col items-center p-4 rounded-2xl bg-white border border-[#E2E8F0]">
      {audioUrl && (
        <audio
          ref={audioPlayerRef}
          src={audioUrl}
          preload="auto"
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            console.warn("Audio element error:", e);
            setIsPlaying(false);
          }}
          className="hidden"
        />
      )}

      <div className="text-center mb-3">
        <h4 className="text-sm font-bold text-[#0F172A]">{title}</h4>
        <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>
      </div>

      {/* Visualizer Container */}
      <div className="w-full max-w-sm h-16 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center overflow-hidden relative mb-4">
        {isRecording ? (
          <>
            <canvas ref={canvasRef} width={280} height={50} className="w-full h-full" />
            <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span>{recordingDuration}s</span>
            </div>
          </>
        ) : audioUrl ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#047857]">
            <Volume2 className="h-4 w-4" />
            <span>Voice Sample Recorded</span>
          </div>
        ) : (
          <span className="text-xs text-[#64748B]">Click Record to start voice sample</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!audioUrl ? (
          <>
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-xs transition-colors cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5" />
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Stop Recording</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Audio</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={togglePlayback}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? "Pause" : "Play Sample"}</span>
            </button>
            <button
              type="button"
              onClick={resetRecording}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Record Again</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
