"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  UserCheck,
  ShieldCheck,
  Zap,
  Lock,
  ChevronRight,
  Camera,
  Mic,
  ArrowRight,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full text-center py-12 sm:py-16 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] mb-6 shadow-2xs">
          <Zap className="h-3.5 w-3.5 text-[#4F46E5]" />
          <span className="text-xs font-bold text-[#4F46E5] tracking-wide uppercase">
            SnapClass 2.0 &bull; Biometric AI Engine
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.15]">
          Effortless Classroom Attendance <br className="hidden sm:inline" />
          Powered by <span className="text-[#4F46E5]">Facial Biometrics</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto leading-relaxed">
          Transform roll call into a single snapshot. Fast, secure, and privacy-first multi-modal
          attendance with facial recognition and voice verification.
        </p>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12 w-full text-left">
          {/* Teacher Portal Card */}
          <div className="group relative rounded-2xl bg-white p-7 border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#C7D2FE] transition-all flex flex-col justify-between">
            <div>
              <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5] mb-5 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#0F172A]">Teacher Portal</h2>
              <p className="text-sm text-[#64748B] mt-2 leading-relaxed">
                Manage academic courses, capture classroom photos or voice clips, review AI-verified
                rosters, and export complete attendance analytics.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <StatusBadge status="neutral">Class Photo Scan</StatusBadge>
                <StatusBadge status="neutral">Voice Review</StatusBadge>
                <StatusBadge status="neutral">CSV Export</StatusBadge>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E2E8F0]">
              <Link
                href="/teacher/login"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-2xs"
              >
                <span>Enter Teacher Portal</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Student Portal Card */}
          <div className="group relative rounded-2xl bg-white p-7 border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#C7D2FE] transition-all flex flex-col justify-between">
            <div>
              <div className="h-12 w-12 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857] mb-5 group-hover:scale-105 transition-transform">
                <UserCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#0F172A]">Student Portal</h2>
              <p className="text-sm text-[#64748B] mt-2 leading-relaxed">
                Sign in with instant camera face recognition. Register biometric profile with
                explicit consent and track your attendance rates across all courses.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <StatusBadge status="success">Face Login</StatusBadge>
                <StatusBadge status="neutral">Optional Voice</StatusBadge>
                <StatusBadge status="neutral">Rate Tracking</StatusBadge>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E2E8F0] flex items-center gap-3">
              <Link
                href="/student/login"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-colors shadow-2xs"
              >
                <Camera className="h-4 w-4" />
                <span>Face Sign-In</span>
              </Link>
              <Link
                href="/student/register"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
              >
                <span>Register</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature / Security Highlights */}
      <section className="w-full py-10 border-t border-[#E2E8F0] max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-xs uppercase tracking-wider font-bold text-[#64748B]">
            Enterprise-Grade Biometric Security
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">Privacy & Consent</h4>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Biometric templates are stored as numeric mathematical embeddings. Raw credentials
              and vectors are never returned to client endpoints.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#FEF2F2] text-[#B91C1C]">
                <Lock className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">Dual-Layer Lockout</h4>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Cryptographically keyed device cookies enforce a 5-failure 60s lockout, with an IP-level
              backstop protecting against automated brute-force attacks.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#047857]">
                <Mic className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A]">Multi-Modal Support</h4>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Seamless attendance verification via classroom crowd photos or high-accuracy voice
              biometric recording for noisy or low-light lecture halls.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
