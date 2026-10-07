"use client";

import React, { useState, useEffect, useRef } from "react";
import { Subject, AttendanceResultEntry, AttendanceLogEntry } from "@/types";
import { api } from "@/lib/api";
import {
  Camera,
  Mic,
  Upload,
  Trash2,
  Play,
  Square,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Loader2,
  Video,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import AttendanceReviewModal from "./AttendanceReviewModal";

interface TakeAttendanceTabProps {
  subjects: Subject[];
  onNavigateToSubjects: () => void;
  onAttendanceSaved: () => void;
}

export default function TakeAttendanceTab({
  subjects,
  onNavigateToSubjects,
  onAttendanceSaved,
}: TakeAttendanceTabProps) {
  // Selected course
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");

  // Scan mode
  const [activeMode, setActiveMode] = useState<"face" | "voice">("face");

  // Face Scan State
  const [photoInputType, setPhotoInputType] = useState<"upload" | "camera">("upload");
  const [stagedPhotos, setStagedPhotos] = useState<File[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Voice Scan State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Analysis / Review State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewResults, setReviewResults] = useState<AttendanceResultEntry[]>([]);
  const [reviewLogs, setReviewLogs] = useState<AttendanceLogEntry[]>([]);

  // Automatically select first subject if available
  useEffect(() => {
    if (subjects.length > 0 && selectedSubjectId === "") {
      setSelectedSubjectId(subjects[0].subject_id);
    }
  }, [subjects, selectedSubjectId]);

  // Clean up camera stream when leaving camera mode or unmounting
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCameraStream = async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      setErrorMsg("Camera access denied or unavailable. Please check browser permissions.");
      setCameraActive(false);
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `cam_snap_${Date.now()}.jpg`, { type: "image/jpeg" });
        setStagedPhotos((prev) => [...prev, file]);
      }
    }, "image/jpeg", 0.92);
  };

  // Photo file uploads
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setStagedPhotos((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setStagedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllPhotos = () => {
    setStagedPhotos([]);
  };

  // Audio recording handlers
  const startAudioRecording = async () => {
    setErrorMsg("");
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(fullBlob);
        setAudioUrl(URL.createObjectURL(fullBlob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMsg("Microphone access denied or unavailable. Please enable permissions.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  // Run AI analysis
  const handleRunAnalysis = async () => {
    if (!selectedSubjectId) {
      setErrorMsg("Please select a course first.");
      return;
    }

    setErrorMsg("");
    setIsAnalyzing(true);

    try {
      if (activeMode === "face") {
        if (stagedPhotos.length === 0) {
          setErrorMsg("Please upload or snap at least one classroom photo.");
          setIsAnalyzing(false);
          return;
        }
        const resp = await api.scanFaceAttendance(Number(selectedSubjectId), stagedPhotos);
        setReviewResults(resp.results);
        setReviewLogs(resp.logs);
        setReviewModalOpen(true);
      } else {
        if (!audioBlob) {
          setErrorMsg("Please record or upload an audio file first.");
          setIsAnalyzing(false);
          return;
        }
        const resp = await api.scanVoiceAttendance(Number(selectedSubjectId), audioBlob);
        setReviewResults(resp.results);
        setReviewLogs(resp.logs);
        setReviewModalOpen(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze attendance. Please check that students are enrolled.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Selected subject metadata
  const currentSubject = subjects.find((s) => s.subject_id === Number(selectedSubjectId));

  if (subjects.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0]">
        <div className="h-12 w-12 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5] mx-auto mb-3">
          <Camera className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-[#0F172A]">No Courses Found</h3>
        <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1 mb-4">
          You haven&apos;t created any courses yet. Create your first subject to start scanning attendance.
        </p>
        <button
          type="button"
          onClick={onNavigateToSubjects}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] shadow-2xs transition-colors"
        >
          <span>Create a Course</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Selector Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 w-full sm:w-auto">
          <label htmlFor="course-selector" className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
            <span>Select Target Course</span>
            <span className="text-[#64748B] font-normal">({subjects.length} active)</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              id="course-selector"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] min-w-[260px]"
            >
              {subjects.map((sub) => (
                <option key={sub.subject_id} value={sub.subject_id}>
                  {sub.name} &bull; Section {sub.section} ({sub.subject_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentSubject && (
          <div className="flex items-center gap-3 text-xs bg-[#F8FAFC] px-4 py-2 rounded-xl border border-[#E2E8F0] self-stretch sm:self-auto justify-between sm:justify-start">
            <div>
              <span className="text-[#64748B]">Enrolled: </span>
              <span className="font-bold text-[#0F172A]">{currentSubject.total_students} students</span>
            </div>
            <div className="h-4 w-px bg-[#E2E8F0]" />
            <div>
              <span className="text-[#64748B]">Sessions: </span>
              <span className="font-bold text-[#0F172A]">{currentSubject.total_classes} total</span>
            </div>
          </div>
        )}
      </div>

      {/* Flattened Mode Selection: Single Clear Choice */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveMode("face")}
              className={`p-3 rounded-xl text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
                activeMode === "face"
                  ? "bg-white text-[#4F46E5] shadow-xs border border-[#C7D2FE]"
                  : "bg-transparent text-[#64748B] hover:bg-white/60 hover:text-[#0F172A]"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                <Camera className="h-4 w-4 text-[#4F46E5]" />
                <span>Class photos</span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1 font-normal leading-tight">
                Use 1-3 clear photos, good lighting, faces visible
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("voice")}
              className={`p-3 rounded-xl text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
                activeMode === "voice"
                  ? "bg-white text-[#4F46E5] shadow-xs border border-[#C7D2FE]"
                  : "bg-transparent text-[#64748B] hover:bg-white/60 hover:text-[#0F172A]"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                <Mic className="h-4 w-4 text-[#4F46E5]" />
                <span>Voice recording</span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1 font-normal leading-tight">
                Record 5-10s roll-call audio of students saying &apos;present&apos;, or upload audio
              </p>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="m-6 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* MODE A: Class photos                                              */}
        {/* ----------------------------------------------------------------- */}
        {activeMode === "face" && (
          <div className="p-6 space-y-6">
            {/* Input Method Small Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] w-fit">
              <button
                type="button"
                onClick={() => {
                  setPhotoInputType("upload");
                  stopCameraStream();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
                  photoInputType === "upload"
                    ? "bg-white text-[#4F46E5] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPhotoInputType("camera");
                  startCameraStream();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
                  photoInputType === "camera"
                    ? "bg-white text-[#4F46E5] shadow-xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                <span>Camera</span>
              </button>
            </div>

            {/* Upload Area */}
            {photoInputType === "upload" && (
              <label className="border-2 border-dashed border-[#CBD5E1] hover:border-[#4F46E5] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#F8FAFC]">
                <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-sm font-bold text-[#0F172A]">Click or drag classroom photos here</div>
                <p className="text-xs text-[#64748B] mt-1">Supports multi-photo selection (JPEG, PNG up to 10 MB each)</p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* Live Camera Area */}
            {photoInputType === "camera" && (
              <div className="bg-[#0F172A] rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-w-lg rounded-xl aspect-4/3 object-cover bg-black"
                />
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    disabled={!cameraActive}
                    className="px-6 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Take Classroom Snapshot</span>
                  </button>
                  <button
                    type="button"
                    onClick={startCameraStream}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                    title="Restart stream"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Staged Photos Gallery */}
            {stagedPhotos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
                    <span>Staged Photos</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[10px]">
                      {stagedPhotos.length} {stagedPhotos.length === 1 ? "photo" : "photos"}
                    </span>
                  </h4>
                  <button
                    type="button"
                    onClick={clearAllPhotos}
                    className="text-xs font-medium text-[#B91C1C] hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear all</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {stagedPhotos.map((file, idx) => {
                    const objectUrl = URL.createObjectURL(file);
                    return (
                      <div
                        key={idx}
                        className="group relative rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC] aspect-square"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={objectUrl}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="p-1.5 rounded-lg bg-white/90 text-[#B91C1C] hover:bg-white transition-colors"
                            title="Remove photo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
                          #{idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Run Analysis Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || stagedPhotos.length === 0}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#CBD5E1] disabled:text-[#475569] disabled:cursor-not-allowed disabled:shadow-none text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Scanning Classroom Faces with AI…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Run Face Analysis ({stagedPhotos.length} photos)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* MODE B: Voice Scan                                                */}
        {/* ----------------------------------------------------------------- */}
        {activeMode === "voice" && (
          <div className="p-6 space-y-6">
            <div className="p-4 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-[#4F46E5] shrink-0 mt-0.5" />
              <div className="text-xs text-[#1E293B] space-y-1">
                <div className="font-bold text-[#0F172A]">Classroom Audio Roll Call</div>
                <p>
                  Record the classroom roll call audio where students state &ldquo;I am present&rdquo;. Our acoustic
                  voice encoder compares speaker vectors against enrolled profiles.
                </p>
              </div>
            </div>

            <div className="border border-[#E2E8F0] rounded-2xl p-6 bg-[#F8FAFC] flex flex-col items-center justify-center text-center space-y-4">
              {/* Recording UI */}
              <div className="relative">
                <button
                  type="button"
                  onClick={isRecording ? stopAudioRecording : startAudioRecording}
                  className={`h-20 w-20 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-[#FEF2F2] border-4 border-[#EF4444] text-[#EF4444] animate-pulse"
                      : "bg-[#EEF2FF] border-2 border-[#C7D2FE] text-[#4F46E5] hover:scale-105"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-8 w-8" />}
                </button>
              </div>

              <div>
                <div className="text-sm font-bold text-[#0F172A]">
                  {isRecording
                    ? `Recording Classroom Audio: 00:${recordSeconds.toString().padStart(2, "0")}`
                    : audioBlob
                    ? "Audio Recorded & Ready"
                    : "Click microphone to start roll-call recording"}
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {isRecording ? "Speak clearly into microphone…" : "Or upload a pre-recorded WAV/WebM audio clip"}
                </p>
              </div>

              {/* Playback preview */}
              {audioUrl && !isRecording && (
                <div className="w-full max-w-md pt-2">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio src={audioUrl} controls className="w-full h-10 rounded-lg" />
                </div>
              )}

              {/* Upload alternative */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-[#4F46E5] hover:underline cursor-pointer">
                  <span>Upload Audio File instead</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Run Voice Analysis Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || !audioBlob}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#CBD5E1] disabled:text-[#475569] disabled:cursor-not-allowed disabled:shadow-none text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Audio & Verifying Speaker Vectors…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Analyze Voice Attendance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review & Manual Override Modal */}
      <AttendanceReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        results={reviewResults}
        initialLogs={reviewLogs}
        subjectName={currentSubject ? `${currentSubject.name} (Sec ${currentSubject.section})` : "Attendance"}
        onSaved={() => {
          setStagedPhotos([]);
          setAudioBlob(null);
          setAudioUrl(null);
          onAttendanceSaved();
        }}
      />
    </div>
  );
}
