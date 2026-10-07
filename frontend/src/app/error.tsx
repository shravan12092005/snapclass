"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, Home, WifiOff, ServerCrash } from "lucide-react";
import Link from "next/link";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  const is503 =
    error.message?.includes("503") ||
    (error as any).status === 503 ||
    error.message?.toLowerCase().includes("service unavailable");
  const isNetwork =
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("failed to fetch");

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
      <div className="h-16 w-16 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#B91C1C] mb-4">
        {isNetwork ? (
          <WifiOff className="h-8 w-8" />
        ) : is503 ? (
          <ServerCrash className="h-8 w-8" />
        ) : (
          <AlertCircle className="h-8 w-8" />
        )}
      </div>

      <h1 className="text-xl font-bold text-[#0F172A]">
        {is503
          ? "AI Biometric Service Temporarily Unavailable"
          : isNetwork
          ? "Network Connection Interrupted"
          : "Something Went Wrong"}
      </h1>

      <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
        {is503
          ? "The face recognition or attendance engine is currently experiencing high load or undergoing maintenance. Please retry in a few moments."
          : isNetwork
          ? "Unable to reach the SnapClass server. Please check your internet connection or local proxy."
          : error.message || "An unexpected error occurred while loading this page."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold shadow-2xs transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
        >
          <Home className="h-3.5 w-3.5 text-[#64748B]" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
