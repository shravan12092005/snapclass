"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  LogOut,
  Sparkles,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";

export default function Navbar() {
  const { currentUser, logout, isTeacher, isStudent } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-[#0F172A]">
                Snap<span className="text-[#4F46E5]">Class</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-[#64748B] hidden sm:block">
                AI Biometric Attendance
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-4">
            {!currentUser.authenticated ? (
              <span className="text-xs font-medium text-[#64748B]">
                AI Biometric Attendance System
              </span>
            ) : (
              <div className="flex items-center gap-3">
                {isTeacher && (
                  <Link
                    href="/teacher"
                    className="text-sm font-medium text-[#0F172A] hover:text-[#4F46E5] transition-colors px-2 py-1"
                  >
                    Dashboard
                  </Link>
                )}
                {isStudent && (
                  <Link
                    href="/student"
                    className="text-sm font-medium text-[#0F172A] hover:text-[#4F46E5] transition-colors px-2 py-1"
                  >
                    My Attendance
                  </Link>
                )}

                {/* Role badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#4F46E5]" />
                  <span className="text-xs font-semibold text-[#0F172A]">
                    {currentUser.role === "teacher"
                      ? (currentUser.user as any)?.name || "Teacher"
                      : (currentUser.user as any)?.name || "Student"}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-[#EEF2FF] text-[#4F46E5]">
                    {currentUser.role}
                  </span>
                </div>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </nav>

          {/* Mobile menu button (only when authenticated) */}
          {currentUser.authenticated && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && currentUser.authenticated && (
          <div className="sm:hidden pb-4 pt-2 border-t border-[#E2E8F0] space-y-2">
            {isTeacher && (
              <Link
                href="/teacher"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                Dashboard
              </Link>
            )}
            {isStudent && (
              <Link
                href="/student"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                My Attendance
              </Link>
            )}
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2]"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
