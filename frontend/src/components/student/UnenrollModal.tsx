"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { StudentDashboardSubject } from "@/types";
import { X, LogOut, AlertTriangle, Loader2 } from "lucide-react";

interface UnenrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: StudentDashboardSubject | null;
  onUnenrolled: () => void;
}

export default function UnenrollModal({
  isOpen,
  onClose,
  subject,
  onUnenrolled,
}: UnenrollModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !subject) return null;

  const handleUnenroll = async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      await api.unenrollFromSubject(subject.subject_id);
      onUnenrolled();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to unenroll from course.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#B91C1C]">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Unenroll from Course</h2>
              <p className="text-xs text-[#64748B]">Confirm course withdrawal</p>
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

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#B91C1C]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <p className="text-xs text-[#0F172A] leading-relaxed">
            Are you sure you want to unenroll from{" "}
            <strong className="text-[#0F172A]">
              {subject.name} {subject.section ? `(Section ${subject.section})` : ""}
            </strong>
            ?
          </p>

          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B] space-y-1">
            <p>
              Your attendance record ({subject.attended}/{subject.total} classes, {subject.rate.toFixed(1)}%) will no longer appear on your active dashboard.
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
              type="button"
              onClick={handleUnenroll}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Unenrolling…</span>
                </>
              ) : (
                <span>Confirm Unenroll</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
