"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LogOut, User, Sparkles, GraduationCap, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const { currentUser, logout, isTeacher, isStudent } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white/95 backdrop-blur shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#0F172A] font-serif">
                Snap<span className="text-[#4F46E5]">Class</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-[#64748B]">
                AI Biometric Attendance
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-4 sm:gap-6">
            {!currentUser.authenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/teacher/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg text-[#0F172A] hover:bg-[#F8FAFC] hover:text-[#4F46E5] transition-colors"
                >
                  <GraduationCap className="h-4 w-4 text-[#4F46E5]" />
                  <span>Teacher Portal</span>
                </Link>
                <Link
                  href="/student/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-xs transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Student Sign-In</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {isTeacher && (
                  <Link
                    href="/teacher"
                    className="text-sm font-medium text-[#0F172A] hover:text-[#4F46E5] transition-colors"
                  >
                    Teacher Dashboard
                  </Link>
                )}
                {isStudent && (
                  <Link
                    href="/student"
                    className="text-sm font-medium text-[#0F172A] hover:text-[#4F46E5] transition-colors"
                  >
                    My Attendance
                  </Link>
                )}

                {/* Role badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
                  <ShieldCheck className="h-4 w-4 text-[#4F46E5]" />
                  <span className="text-xs font-semibold text-[#0F172A]">
                    {currentUser.role === "teacher"
                      ? (currentUser.user as any)?.name || "Teacher"
                      : (currentUser.user as any)?.name || "Student"}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5]">
                    {currentUser.role}
                  </span>
                </div>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
