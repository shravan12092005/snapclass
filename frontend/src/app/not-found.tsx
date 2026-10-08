import React from "react";
import Link from "next/link";
import { Sparkles, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="h-16 w-16 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5] mb-6 shadow-xs animate-bounce">
        <Sparkles className="h-8 w-8" />
      </div>

      <span className="text-xs uppercase font-extrabold tracking-widest text-[#4F46E5] mb-2">
        Error 404
      </span>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
        Page Not Found
      </h1>

      <p className="mt-3 text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
        The classroom page or resource you are looking for doesn&rsquo;t exist, has been moved, or the link expired.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-2xs transition-all hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
        >
          <Home className="h-4 w-4" />
          <span>Return Home</span>
        </Link>
        <Link
          href="/teacher/login"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold shadow-2xs transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-[#64748B]" />
          <span>Teacher Sign-In</span>
        </Link>
      </div>
    </div>
  );
}
