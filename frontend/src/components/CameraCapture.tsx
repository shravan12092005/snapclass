"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Camera, RefreshCw, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { dataUrlToBlob } from "@/lib/imageUtils";

export interface CameraCaptureHandle {
  reset: () => void;
}

export interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onRetake?: () => void;
  initialBlob?: Blob | null;
  hideRetakeButton?: boolean;
  title?: string;
  subtitle?: string;
}

const CameraCapture = forwardRef<CameraCaptureHandle, CameraCaptureProps>(
  function CameraCapture(
    {
      onCapture,
      onRetake,
      initialBlob = null,
      hideRetakeButton = false,
      title = "Face Recognition Capture",
      subtitle = "Position your face within the oval guide for optimal recognition",
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [videoReady, setVideoReady] = useState(false);
    const [useUploadFallback, setUseUploadFallback] = useState(() => {
      return typeof window !== "undefined" && window.location.search.includes("mode=upload");
    });

    // ── Stop camera ───────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }, []);

    // ── Start camera ──────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
      if (streamRef.current) return;
      setIsInitializing(true);
      setCameraError(null);
      setVideoReady(false);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API is not supported in this browser environment.");
        }

        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { ideal: "user" },
            },
            audio: false,
          });
        } catch (constraintErr) {
          // Fallback for Safari/browsers with stricter constraints
          console.warn("Retrying with simple video constraint for Safari:", constraintErr);
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        // If photo already set while resolving, immediately stop stream
        if (capturedUrl) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = mediaStream;
        if (videoRef.current) {
          const v = videoRef.current;
          v.srcObject = mediaStream;
          v.setAttribute("playsinline", "true");
          v.setAttribute("webkit-playsinline", "true");
          v.muted = true;
          v.play().catch(() => {});
        }
      } catch (err: any) {
        console.warn("Camera access failed:", err);
        let msg = "Could not access camera. Please allow camera permissions or upload a photo below.";
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          msg = "Camera permission was denied. Please allow camera access in your browser settings or upload a photo.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          msg = "No webcam device was found on this computer. Please use the photo upload option.";
        }
        setCameraError(msg);
        setUseUploadFallback(true);
      } finally {
        setIsInitializing(false);
      }
    }, [capturedUrl]);

    // ── Handle initialBlob ─────────────────────────────────────────────────
    useEffect(() => {
      if (initialBlob) {
        const url = URL.createObjectURL(initialBlob);
        setCapturedUrl(url);
        setCameraError(null);
        setIsInitializing(false);
        stopCamera();
        return () => {
          URL.revokeObjectURL(url);
        };
      }
    }, [initialBlob, stopCamera]);

    // ── Mount / unmount: start once if not initialBlob, stop on cleanup ───
    useEffect(() => {
      if (!useUploadFallback && !initialBlob) {
        startCamera();
      }
      return () => {
        stopCamera();
      };
    }, [useUploadFallback, initialBlob, startCamera, stopCamera]);

    // ── Re-attach stream whenever the <video> element mounts ─────────────
    const attachStream = useCallback((el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && streamRef.current) {
        el.srcObject = streamRef.current;
        el.setAttribute("playsinline", "true");
        el.setAttribute("webkit-playsinline", "true");
        el.muted = true;
        el.play().catch(() => {});
      }
    }, []);

    // ── Retake ────────────────────────────────────────────────────────────
    const handleRetake = useCallback(() => {
      if (capturedUrl) {
        URL.revokeObjectURL(capturedUrl);
      }
      setCapturedUrl(null);
      setVideoReady(false);
      onRetake?.();
      if (!useUploadFallback) {
        startCamera();
      }
    }, [capturedUrl, onRetake, useUploadFallback, startCamera]);

    // ── Imperative handle for parent control ──────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        reset: handleRetake,
      }),
      [handleRetake]
    );

    // ── Capture ───────────────────────────────────────────────────────────
    const handleCapture = () => {
      if (!videoRef.current || !canvasRef.current || !videoReady) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const blob = dataUrlToBlob(dataUrl);
        const url = URL.createObjectURL(blob);
        setCapturedUrl(url);
        onCapture(blob);
      } catch {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setCapturedUrl(url);
              onCapture(blob);
            }
          },
          "image/jpeg",
          0.95
        );
      }
    };

    // ── File upload fallback ──────────────────────────────────────────────
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (capturedUrl) {
          URL.revokeObjectURL(capturedUrl);
        }
        stopCamera();
        const url = URL.createObjectURL(file);
        setCapturedUrl(url);
        onCapture(file);
      }
      if (e.target) {
        e.target.value = "";
      }
    };

    return (
      <div className="w-full flex flex-col items-center">
        {/* Hidden processing canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Global hidden file input for photo uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={handleFileUpload}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Header Info */}
        {(title || subtitle) && (
          <div className="text-center mb-4">
            {title && <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>}
            {subtitle && <p className="text-xs text-[#64748B] mt-1 max-w-sm">{subtitle}</p>}
          </div>
        )}

        {/* Video Viewport with Oval Framing Guide */}
        <div className="relative w-full max-w-md aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 border-2 border-[#E2E8F0] shadow-md flex items-center justify-center">
          {capturedUrl ? (
            <div className="relative w-full h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedUrl} alt="Captured face" className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-semibold text-[#047857] flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Photo Ready</span>
              </div>
            </div>
          ) : !useUploadFallback && !cameraError ? (
            <>
              <video
                ref={attachStream}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  (e.target as HTMLVideoElement).play().catch(() => {});
                  setVideoReady(true);
                }}
                onCanPlay={() => setVideoReady(true)}
                onLoadedData={() => setVideoReady(true)}
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* SVG Oval Framing Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <mask id="oval-mask">
                      <rect width="400" height="300" fill="white" />
                      <ellipse cx="200" cy="150" rx="85" ry="115" fill="black" />
                    </mask>
                  </defs>
                  {/* Darkened outer mask */}
                  <rect width="400" height="300" fill="rgba(15, 23, 42, 0.40)" mask="url(#oval-mask)" />
                  {/* Oval guide border with subtle glow */}
                  <ellipse
                    cx="200"
                    cy="150"
                    rx="85"
                    ry="115"
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />
                </svg>
              </div>
            </>
          ) : (
            /* File Upload / Camera Error View */
            <div className="p-6 text-center flex flex-col items-center justify-center text-slate-300">
              <Upload className="h-10 w-10 text-indigo-400 mb-2" />
              <p className="text-sm font-semibold text-white">Upload Face Photo</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Select a clear frontal portrait photo (JPEG or PNG, under 10MB)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                Choose File
              </button>
            </div>
          )}
        </div>

        {/* Alignment Guide Instruction - Positioned below video, never covering face/body */}
        {!capturedUrl && !useUploadFallback && !cameraError && (
          <div className="mt-2.5 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-xs font-semibold text-[#4F46E5]">
              Align face inside oval
            </span>
          </div>
        )}

        {/* Camera Error Alert */}
        {cameraError && !capturedUrl && (
          <div className="w-full max-w-md mt-3 p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2.5 text-xs text-[#B45309]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Notice:</span> {cameraError}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center gap-3 mt-4">
          {capturedUrl ? (
            !hideRetakeButton && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] shadow-2xs transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retake Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Different Photo</span>
                </button>
              </div>
            )
          ) : !useUploadFallback ? (
            <>
              <button
                type="button"
                onClick={handleCapture}
                disabled={isInitializing || !videoReady}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm disabled:opacity-50 transition-all hover:scale-[1.02]"
              >
                <Camera className="h-4 w-4" />
                <span>Capture Face</span>
              </button>
              <button
                type="button"
                onClick={() => setUseUploadFallback(true)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A]"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Use File Upload</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setUseUploadFallback(false);
                startCamera();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4F46E5] hover:underline"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Try Camera Again</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);

export default CameraCapture;
