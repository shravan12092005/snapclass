"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { X, KeyRound, Loader2, AlertCircle, Sparkles } from "lucide-react";

interface EnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrolled: () => void;
  initialCode?: string;
}

export default function EnrollModal({
  isOpen,
  onClose,
  onEnrolled,
  initialCode = "",
}: EnrollModalProps) {
  const [code, setCode] = useState(initialCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  React.useEffect(() => {
    if (initialCode) {
      setCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg("Please enter a valid course code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const resp = await api.enrollInSubject(cleanCode);
      setSuccessMsg(resp.message || "Successfully enrolled!");
      setTimeout(() => {
        setCode("");
        setSuccessMsg("");
        onEnrolled();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to enroll in course. Please check the code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Enroll in Course</h2>
              <p className="text-xs text-[#64748B]">Enter code provided by your instructor</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#B91C1C]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center gap-2 text-xs text-[#047857]">
              <Sparkles className="h-4 w-4 shrink-0 text-[#047857]" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="course-code-input" className="text-xs font-semibold text-[#0F172A]">Course Enrollment Code</label>
            <input
              id="course-code-input"
              type="text"
              placeholder="e.g. CS101 or 7-character code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-sm uppercase tracking-wider text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              disabled={isSubmitting}
              autoFocus
            />
            <p className="text-[11px] text-[#64748B] mt-1">
              Ask your teacher for the course code or scan the QR code link.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="px-5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enrolling…</span>
                </>
              ) : (
                <span>Enroll in Course</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
