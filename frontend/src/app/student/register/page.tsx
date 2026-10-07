"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import CameraCapture from "@/components/CameraCapture";
import VoiceRecorder from "@/components/VoiceRecorder";
import {
  UserPlus,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Camera,
  Mic,
} from "lucide-react";
import Link from "next/link";

export default function StudentRegisterPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [faceBlob, setFaceBlob] = useState<Blob | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full student name.");
      return;
    }
    if (!consent) {
      setError("You must provide consent for biometric attendance processing.");
      return;
    }
    if (!faceBlob) {
      setError("Please capture or upload a clear facial portrait photo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.registerStudent(name.trim(), consent, faceBlob, voiceBlob);
      setSuccessMessage(res.message || "Profile successfully created!");
      await refreshAuth();
      setTimeout(() => {
        router.push("/student");
      }, 1200);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to register student profile. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-6 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] items-center justify-center text-[#4F46E5] mb-3">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Student Biometric Enrollment</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Register your facial vector and optional voice profile for automated classroom roll calls
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-start gap-2.5 text-xs text-[#047857]">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Basic Info */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Full Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#64748B] focus:border-[#4F46E5] focus:outline-hidden transition-colors"
            />
          </div>

          {/* 2. Face Capture */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4 text-[#4F46E5]" />
              <span className="text-xs font-bold uppercase tracking-wide text-[#0F172A]">
                Step 1: Face Capture (Required)
              </span>
            </div>
            <CameraCapture
              onCapture={(blob) => setFaceBlob(blob)}
              title=""
              subtitle="Capture your face in the oval guide for AI attendance recognition"
            />
          </div>

          {/* 3. Voice Profile (Optional) */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="h-4 w-4 text-[#4F46E5]" />
              <span className="text-xs font-bold uppercase tracking-wide text-[#0F172A]">
                Step 2: Voice Profile (Optional)
              </span>
            </div>
            <VoiceRecorder
              onAudioReady={(blob) => setVoiceBlob(blob)}
              title=""
              subtitle="Record 3-5 seconds of audio to enable voice roll calls in lecture halls"
            />
          </div>

          {/* 4. Mandatory Biometric Consent */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <label htmlFor="student-consent" className="flex items-start gap-3 cursor-pointer select-none">
              <input
                id="student-consent"
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#CBD5E1] text-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-1 cursor-pointer shrink-0"
              />
              <div className="text-xs text-[#0F172A] leading-relaxed">
                <span className="font-bold text-[#0F172A] block mb-0.5">Biometric Privacy & Consent</span>
                <p className="text-[#64748B]">
                  I consent to the capture and processing of my facial and optional voice embeddings
                  strictly for verified academic attendance. Biometric data is stored as numeric embeddings,
                  never as photos.
                </p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-bold shadow-xs disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Training AI Biometric Classifier…</span>
              </>
            ) : (
              <span>Complete Enrollment</span>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-[#0F172A] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
          <div>
            <span>Already enrolled? </span>
            <Link href="/student/login" className="font-semibold text-[#4F46E5] hover:underline">
              Face Sign-In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
