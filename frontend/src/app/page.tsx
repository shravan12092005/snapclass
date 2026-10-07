"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  UserCheck,
  ShieldCheck,
  Lock,
  ChevronRight,
  Camera,
  Mic,
  Sparkles,
  Scan,
  Eye,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full text-center py-16 sm:py-24 max-w-4xl mx-auto relative">
        {/* Decorative gradient blobs */}
        <div className="absolute -top-20 -left-32 w-72 h-72 bg-indigo-200 rounded-full opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-32 w-72 h-72 bg-emerald-200 rounded-full opacity-20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#EEF2FF] to-[#ECFDF5] border border-[#C7D2FE] mb-8 shadow-sm">
            <Sparkles className="h-4 w-4 text-[#4F46E5]" />
            <span className="text-xs font-bold text-[#4F46E5] tracking-wide uppercase">
              SnapClass 2.0 &bull; AI Biometric Engine
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.12]">
            Effortless Attendance{" "}
            <br className="hidden sm:inline" />
            Powered by{" "}
            <span className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
              Facial Biometrics
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto leading-relaxed">
            Transform roll call into a single snapshot. Fast, secure, and privacy-first
            multi-modal attendance with facial recognition and voice verification.
          </p>

          {/* Floating feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { icon: Scan, label: "Face and voice attendance" },
              { icon: Eye, label: "Consent-based enrolment" },
              { icon: Lock, label: "Device lockout after failed attempts" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-xs font-medium text-[#475569] shadow-xs"
              >
                <Icon className="h-3.5 w-3.5 text-[#4F46E5]" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal Cards */}
      <section className="w-full max-w-4xl mx-auto -mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
          {/* Teacher Portal Card */}
          <div className="group relative rounded-2xl bg-white p-7 border border-[#E2E8F0] shadow-sm hover:shadow-lg hover:border-[#C7D2FE] transition-all duration-300 flex flex-col justify-between overflow-hidden">
            {/* Decorative corner gradient */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-[#EEF2FF] to-transparent rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5] mb-5 group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-[#0F172A]">Teacher Portal</h2>
              <p className="text-sm text-[#64748B] mt-2 leading-relaxed">
                Manage courses, capture classroom photos or voice clips, review AI-verified
                rosters, and export attendance analytics.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {["Class Photo Scan", "Voice Review", "CSV Export"].map((label) => (
                  <span
                    key={label}
                    className="px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] font-semibold text-[#475569]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mt-8 pt-4 border-t border-[#E2E8F0]">
              <Link
                href="/teacher/login"
                className="inline-flex items-center justify-between w-full px-5 py-3 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm group-hover:shadow-md"
              >
                <span>Enter Teacher Portal</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Student Portal Card */}
          <div className="group relative rounded-2xl bg-white p-7 border border-[#E2E8F0] shadow-sm hover:shadow-lg hover:border-[#A7F3D0] transition-all duration-300 flex flex-col justify-between overflow-hidden">
            {/* Decorative corner gradient */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-[#ECFDF5] to-transparent rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] border border-[#A7F3D0] flex items-center justify-center text-[#047857] mb-5 group-hover:scale-110 transition-transform duration-300">
                <UserCheck className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-[#0F172A]">Student Portal</h2>
              <p className="text-sm text-[#64748B] mt-2 leading-relaxed">
                Sign in with instant face recognition. Register your biometric profile with
                explicit consent and track attendance across all courses.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {["Face Login", "Optional Voice", "Rate Tracking"].map((label) => (
                  <span
                    key={label}
                    className="px-2.5 py-1 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] font-semibold text-[#047857]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mt-8 pt-4 border-t border-[#E2E8F0] flex items-center gap-3">
              <Link
                href="/student/login"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-all shadow-sm group-hover:shadow-md"
              >
                <Camera className="h-4 w-4" />
                <span>Face Sign-In</span>
              </Link>
              <Link
                href="/student/register"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
              >
                <span>Register</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature / Security Highlights */}
      <section className="w-full py-16 mt-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest font-bold text-[#4F46E5] mb-2">
            Why SnapClass
          </p>
          <h3 className="text-2xl font-bold text-[#0F172A]">
            Face and voice attendance
          </h3>
          <p className="text-sm text-[#64748B] mt-2 max-w-lg mx-auto">
            Device lockout after failed attempts and consent-based enrolment
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: ShieldCheck,
              iconBg: "bg-[#EEF2FF]",
              iconColor: "text-[#4F46E5]",
              title: "Privacy & Consent",
              description:
                "Biometric templates are stored as numeric mathematical embeddings. Raw credentials and vectors are never returned to client endpoints.",
            },
            {
              icon: Lock,
              iconBg: "bg-[#FEF2F2]",
              iconColor: "text-[#B91C1C]",
              title: "Dual-Layer Lockout",
              description:
                "Cryptographically keyed device cookies enforce a 5-failure 60s lockout, with an IP-level backstop protecting against automated brute-force attacks.",
            },
            {
              icon: Mic,
              iconBg: "bg-[#ECFDF5]",
              iconColor: "text-[#047857]",
              title: "Multi-Modal Support",
              description:
                "Seamless attendance via classroom crowd photos or high-accuracy voice biometric recording for noisy or low-light lecture halls.",
            },
          ].map(({ icon: Icon, iconBg, iconColor, title, description }) => (
            <div
              key={title}
              className="group p-6 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-[#0F172A]">{title}</h4>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
