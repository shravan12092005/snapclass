"use client";

import React from "react";
import { Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

export interface ProcessingOverlayProps {
  isProcessing: boolean;
  title: string;
  subMessage: string;
  elapsedSeconds: number;
  uploadPercent?: number | null;
  allowCancel?: boolean;
  isTimedOut?: boolean;
  successMessage?: string | null;
  onCancel?: () => void;
  onRetry?: () => void;
}

export default function ProcessingOverlay({
  isProcessing,
  title,
  subMessage,
  elapsedSeconds,
  uploadPercent = null,
  allowCancel = false,
  isTimedOut = false,
  successMessage,
  onCancel,
  onRetry,
}: ProcessingOverlayProps) {
  if (!isProcessing && !successMessage) return null;

  const isUploading = typeof uploadPercent === "number" && uploadPercent < 100;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-30 bg-white/92 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in transition-all duration-200"
    >
      {/* Success State */}
      {successMessage ? (
        <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
          <div className="h-14 w-14 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857] mb-3 shadow-xs">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-[#047857]">{successMessage}</h3>
          <p className="text-xs text-[#64748B] mt-1">Redirecting to your dashboard…</p>
        </div>
      ) : isTimedOut ? (
        /* Timeout Error State (after 45s) */
        <div className="flex flex-col items-center max-w-xs animate-in fade-in duration-200">
          <div className="h-14 w-14 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#B91C1C] mb-3 shadow-xs">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">Request Timed Out</h3>
          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
            The operation took longer than 45 seconds to complete. The server might be under heavy load.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
            >
              Try Again
            </button>
          )}
        </div>
      ) : (
        /* Active Processing State */
        <div className="flex flex-col items-center max-w-sm">
          {/* Spinner / Upload Ring */}
          <div className="relative mb-4">
            {isUploading ? (
              <div className="relative h-14 w-14 flex items-center justify-center">
                <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-[#E2E8F0]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#4F46E5] transition-all duration-300"
                    strokeDasharray={`${uploadPercent ?? 0}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[11px] font-bold text-[#4F46E5] font-mono">
                  {uploadPercent}%
                </span>
              </div>
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5] shadow-xs">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            )}
          </div>

          {/* Action Title */}
          <h3 className="text-base font-bold text-[#0F172A]">{title}</h3>

          {/* Cycling Sub-message */}
          <p className="text-xs font-medium text-[#4F46E5] mt-1.5 min-h-[18px] transition-opacity">
            {subMessage}
          </p>

          {/* Elapsed Time & Long-running Hints */}
          {elapsedSeconds >= 3 && (
            <p className="text-[11px] text-[#64748B] mt-2 font-mono">
              Still working… {elapsedSeconds}s
            </p>
          )}

          {elapsedSeconds >= 15 && (
            <p className="text-[11px] text-[#B45309] mt-1 font-medium bg-[#FFFBEB] px-2.5 py-0.5 rounded-full border border-[#FDE68A] animate-in fade-in">
              This is taking longer than usual
            </p>
          )}

          {/* Abort / Cancel Button after 15s */}
          {allowCancel && elapsedSeconds >= 15 && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-4 px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] hover:text-[#B91C1C] hover:border-[#FECACA] shadow-xs transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancel Operation</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
