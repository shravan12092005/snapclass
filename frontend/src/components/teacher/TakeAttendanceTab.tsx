import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Subject, AttendanceResultEntry, AttendanceLogEntry } from "@/types";
import { api, ApiError } from "@/lib/api";
import {
  Camera,
  Mic,
  Upload,
  Trash2,
  Square,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Video,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import AttendanceReviewModal from "./AttendanceReviewModal";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import { useProcessing } from "@/hooks/useProcessing";
import { scaleImageFile, dataUrlToBlob } from "@/lib/imageUtils";
import { getSupportedAudioMimeType, convertBlobToWav } from "@/lib/audioUtils";

interface TakeAttendanceTabProps {
  subjects: Subject[];
  onNavigateToSubjects: () => void;
  onAttendanceSaved: () => void;
}

function StagedPhotoThumbnail({
  file,
  index,
  isProcessing,
  onRemove,
}: {
  file: File | Blob;
  index: number;
  isProcessing: boolean;
  onRemove: (idx: number) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const size = (file as File).size || (file as Blob).size || 0;
  const sizeStr =
    size > 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(size / 1024)} KB`;

  return (
    <div className="group relative rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC] aspect-square">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={`Classroom photo ${index + 1}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-100">
          <span className="text-xs text-slate-400">Loading…</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={isProcessing}
          className="p-1.5 rounded-lg bg-white/90 text-[#B91C1C] hover:bg-white transition-colors"
          title="Remove photo"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
        #{index + 1}
      </div>
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
        {sizeStr}
      </div>
    </div>
  );
}

export default function TakeAttendanceTab({
  subjects,
  onNavigateToSubjects,
  onAttendanceSaved,
}: TakeAttendanceTabProps) {
  const searchParams = useSearchParams();
  // Selected course
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");

  // Scan mode
  const [activeMode, setActiveMode] = useState<"face" | "voice">(
    searchParams.get("mode") === "voice" ? "voice" : "face"
  );

  // Face Scan State
  const [photoInputType, setPhotoInputType] = useState<"upload" | "camera">(
    searchParams.get("input") === "camera" ? "camera" : "upload"
  );
  const [stagedPhotos, setStagedPhotos] = useState<File[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (searchParams.get("mode") === "voice") {
      setActiveMode("voice");
    } else if (searchParams.get("mode") === "face") {
      setActiveMode("face");
    }
    if (searchParams.get("input") === "camera") {
      setPhotoInputType("camera");
    }
  }, [searchParams]);

  // Keep video.srcObject synced whenever stream or mode changes
  useEffect(() => {
    if (photoInputType === "camera" && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [photoInputType, cameraActive]);

  // Voice Scan State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Analysis / Review State
  const [errorMsg, setErrorMsg] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewResults, setReviewResults] = useState<AttendanceResultEntry[]>([]);
  const [reviewLogs, setReviewLogs] = useState<AttendanceLogEntry[]>([]);

  const {
    isProcessing,
    title,
    subMessage,
    elapsedSeconds,
    uploadPercent,
    allowCancel,
    isTimedOut,
    startProcessing,
    stopProcessing,
    setUploadPercent,
    cancel,
    retry,
  } = useProcessing();

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
    setVideoReady(false);
  };

  const startCameraStream = async () => {
    setErrorMsg("");
    setVideoReady(false);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: "environment" },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (constraintErr) {
        // Fallback for Safari on Mac (which throws OverconstrainedError on environment facingMode)
        console.warn("Retrying with simple video constraint for Safari:", constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        const v = videoRef.current;
        v.srcObject = stream;
        v.setAttribute("playsinline", "true");
        v.setAttribute("webkit-playsinline", "true");
        v.muted = true;
        v.play().catch(() => {});
      }
      setCameraActive(true);
    } catch {
      setErrorMsg("Camera access denied or unavailable in this browser. Please check camera permissions.");
      setCameraActive(false);
      setVideoReady(false);
    }
  };

  const attachVideo = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.setAttribute("playsinline", "true");
      el.setAttribute("webkit-playsinline", "true");
      el.muted = true;
      el.play().catch(() => {});
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) {
      setErrorMsg("Camera is not ready. Please restart the video stream.");
      return;
    }
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (width === 0 || height === 0) {
      setErrorMsg("Camera stream is still initializing. Please wait a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    // Trigger visual shutter flash
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    const filename = `cam_snap_${Date.now()}.jpg`;
    try {
      // Synchronous toDataURL + dataUrlToBlob ensures 100% Safari/WebKit compatibility
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const blob = dataUrlToBlob(dataUrl);
      let file: File | Blob = blob;
      try {
        file = new File([blob], filename, { type: "image/jpeg" });
      } catch {
        (blob as any).name = filename;
        file = blob;
      }
      setStagedPhotos((prev) => [...prev, file as File]);
      setErrorMsg("");
    } catch {
      // Fallback to toBlob if toDataURL fails
      canvas.toBlob(
        (blob) => {
          if (blob) {
            let file: File | Blob = blob;
            try {
              file = new File([blob], filename, { type: "image/jpeg" });
            } catch {
              (blob as any).name = filename;
              file = blob;
            }
            setStagedPhotos((prev) => [...prev, file as File]);
            setErrorMsg("");
          } else {
            setErrorMsg("Failed to capture snapshot frame from camera.");
          }
        },
        "image/jpeg",
        0.92
      );
    }
  };

  // Photo file uploads (file picker)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    if (newFiles.length > 0) {
      setStagedPhotos((prev) => [...prev, ...newFiles]);
      setErrorMsg("");
    }
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(f.name)
      );
      if (dropped.length > 0) {
        setStagedPhotos((prev) => [...prev, ...dropped]);
        setErrorMsg("");
      } else {
        setErrorMsg("Please drop valid image files (JPEG, PNG, WebP).");
      }
    }
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
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = getSupportedAudioMimeType();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const actualMime = recorder.mimeType || mime || "audio/webm";
        const rawBlob = new Blob(audioChunksRef.current, { type: actualMime });
        const finalBlob = await convertBlobToWav(rawBlob);
        setAudioBlob(finalBlob);
        setAudioUrl(URL.createObjectURL(finalBlob));
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
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
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

    if (activeMode === "face") {
      if (stagedPhotos.length === 0) {
        setErrorMsg("Please upload or snap at least one classroom photo.");
        return;
      }

      const count = stagedPhotos.length;
      const countMsg =
        count === 1
          ? "Analyzing 1 classroom photo… this can take up to a minute for large classes"
          : `Analyzing ${count} photos… this can take up to a minute for large classes`;

      const signal = startProcessing({
        title: "Scanning Classroom Faces with AI",
        steps: [
          "Uploading photos…",
          countMsg,
          "Detecting faces and computing embeddings…",
          "Matching with enrolled roster…",
        ],
        allowCancel: true,
        onRetry: handleRunAnalysis,
      });

      try {
        // Downscale photos client-side to max 1280px before uploading
        const scaledPhotos = await Promise.all(
          stagedPhotos.map((file) => scaleImageFile(file, 1280))
        );

        const resp = await api.scanFaceAttendance(Number(selectedSubjectId), scaledPhotos, {
          signal,
          onProgress: (pct) => setUploadPercent(pct),
        });

        stopProcessing();
        setReviewResults(resp.results);
        setReviewLogs(resp.logs);
        setReviewModalOpen(true);
      } catch (err: any) {
        stopProcessing();
        if (err.name === "AbortError") {
          setErrorMsg("Face recognition scan was cancelled.");
          return;
        }
        if (err instanceof ApiError) {
          if (err.status === 400) {
            setErrorMsg(err.message || "No faces detected in the photos, or photo quality too low.");
          } else if (err.status === 401) {
            setErrorMsg("Session expired or unauthorized. Please re-authenticate.");
          } else if (err.status === 429) {
            setErrorMsg(err.message || "Too many requests. Please wait a moment before running another analysis.");
          } else if (err.status === 503) {
            setErrorMsg("The AI biometric service is temporarily unavailable. Please try again in a moment.");
          } else {
            setErrorMsg(err.message);
          }
        } else {
          setErrorMsg("Network error during facial recognition scan. Please check your connection.");
        }
      }
    } else {
      // Voice mode
      if (!audioBlob) {
        setErrorMsg("Please record or upload an audio file first.");
        return;
      }

      const signal = startProcessing({
        title: "Processing Classroom Voice Roll Call",
        steps: [
          "Uploading audio…",
          "Converting audio…",
          "Matching voices…",
        ],
        allowCancel: true,
        onRetry: handleRunAnalysis,
      });

      try {
        const resp = await api.scanVoiceAttendance(Number(selectedSubjectId), audioBlob, {
          signal,
          onProgress: (pct) => setUploadPercent(pct),
        });

        stopProcessing();
        setReviewResults(resp.results);
        setReviewLogs(resp.logs);
        setReviewModalOpen(true);
      } catch (err: any) {
        stopProcessing();
        if (err.name === "AbortError") {
          setErrorMsg("Voice recognition scan was cancelled.");
          return;
        }
        if (err instanceof ApiError) {
          if (err.status === 503) {
            setErrorMsg("The voice biometric service is temporarily unavailable. Please try again in a moment.");
          } else {
            setErrorMsg(err.message);
          }
        } else {
          setErrorMsg("Network error during voice recognition scan. Please check your connection.");
        }
      }
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

      {currentSubject && currentSubject.total_students === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>No students enrolled yet</strong> in this course. Share the course code with students to join before scanning attendance.
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateToSubjects}
            className="text-xs font-bold text-amber-800 hover:underline shrink-0"
          >
            Manage Course &rarr;
          </button>
        </div>
      )}

      {/* Flattened Mode Selection: Single Clear Choice */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden relative">
        {/* Processing Feedback Overlay */}
        <ProcessingOverlay
          isProcessing={isProcessing}
          title={title}
          subMessage={subMessage}
          elapsedSeconds={elapsedSeconds}
          uploadPercent={uploadPercent}
          allowCancel={allowCancel}
          isTimedOut={isTimedOut}
          onCancel={cancel}
          onRetry={retry}
        />

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

            {/* Upload Area with Full Drag-and-Drop and Native Click */}
            {photoInputType === "upload" && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#4F46E5] bg-[#EEF2FF] ring-4 ring-[#C7D2FE]"
                    : "border-[#CBD5E1] hover:border-[#4F46E5] bg-[#F8FAFC]"
                }`}
              >
                <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-sm font-bold text-[#0F172A]">
                  {isDragging ? "Drop classroom photos now!" : "Click or drag classroom photos here"}
                </div>
                <p className="text-xs text-[#64748B] mt-1">Supports multi-photo selection (JPEG, PNG, WebP up to 10 MB each)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,image/jpeg,image/png,image/webp,image/heic"
                  onChange={handlePhotoUpload}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden"
                />
              </div>
            )}

            {/* Live Camera Area */}
            {photoInputType === "camera" && (
              <div className="bg-[#0F172A] rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                {shutterFlash && (
                  <div className="absolute inset-0 bg-white opacity-80 pointer-events-none transition-opacity duration-200 z-10" />
                )}
                <video
                  ref={attachVideo}
                  onLoadedMetadata={(e) => {
                    (e.target as HTMLVideoElement).play().catch(() => {});
                    setVideoReady(true);
                  }}
                  onCanPlay={() => setVideoReady(true)}
                  onLoadedData={() => setVideoReady(true)}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-w-lg rounded-xl aspect-4/3 object-cover bg-black"
                />
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    disabled={!cameraActive || !videoReady}
                    className="px-6 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#94A3B8] disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
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
                  {stagedPhotos.length > 0 && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {stagedPhotos.length} {stagedPhotos.length === 1 ? "photo" : "photos"} staged
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick Action Banner When Photos Are Staged */}
            {stagedPhotos.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE]">
                <div className="flex items-center gap-2 text-xs text-[#1E293B]">
                  <CheckCircle2 className="h-4 w-4 text-[#4F46E5]" />
                  <span>
                    <strong className="text-[#0F172A]">{stagedPhotos.length} {stagedPhotos.length === 1 ? "photo ready" : "photos ready"}</strong> &mdash; scan faces against the course roster.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Run Face Analysis ({stagedPhotos.length})</span>
                </button>
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
                    disabled={isProcessing}
                    className="text-xs font-medium text-[#B91C1C] hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear all</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {stagedPhotos.map((file, idx) => (
                    <StagedPhotoThumbnail
                      key={`${idx}-${(file as File).name || "photo"}-${file.size}`}
                      file={file}
                      index={idx}
                      isProcessing={isProcessing}
                      onRemove={removePhoto}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Run Analysis Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isProcessing || stagedPhotos.length === 0}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#CBD5E1] disabled:text-[#475569] disabled:cursor-not-allowed disabled:shadow-none text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
              >
                <Sparkles className="h-4 w-4" />
                <span>Run Face Analysis ({stagedPhotos.length} {stagedPhotos.length === 1 ? "photo" : "photos"})</span>
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
                disabled={isProcessing || !audioBlob}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#CBD5E1] disabled:text-[#475569] disabled:cursor-not-allowed disabled:shadow-none text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
              >
                <Sparkles className="h-4 w-4" />
                <span>Analyze Voice Attendance</span>
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
