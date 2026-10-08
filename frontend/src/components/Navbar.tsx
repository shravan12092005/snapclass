"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LogOut,
  Sparkles,
  Menu,
  X,
  ArrowRight,
  UserCheck,
  GraduationCap,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const { currentUser, logout, isTeacher, isStudent } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("top");

  // Determine user dashboard destination
  const dashboardHref = isTeacher ? "/teacher" : isStudent ? "/student" : "/";

  // Scroll spy for landing page sections
  useEffect(() => {
    if (!isHomePage) return;

    const sectionIds = ["top", "features", "teachers", "students", "tech"];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        if (id === "top") {
          if (window.scrollY < 200) {
            setActiveSection("top");
            break;
          }
        } else {
          const el = document.getElementById(id);
          if (el && el.offsetTop <= scrollPosition) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="SnapClass Home">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105">
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
          {isHomePage ? (
            <>
              {/* Desktop Scroll-spy Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                <a
                  href="#top"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeSection === "top"
                      ? "text-[#4F46E5] bg-[#EEF2FF]"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  Home
                </a>
                <a
                  href="#features"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeSection === "features"
                      ? "text-[#4F46E5] bg-[#EEF2FF]"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  Features
                </a>
                <a
                  href="#teachers"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeSection === "teachers"
                      ? "text-[#4F46E5] bg-[#EEF2FF]"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  Teacher Journey
                </a>
                <a
                  href="#students"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeSection === "students"
                      ? "text-[#4F46E5] bg-[#EEF2FF]"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  Students
                </a>
                <a
                  href="#tech"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeSection === "tech"
                      ? "text-[#4F46E5] bg-[#EEF2FF]"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  Tech
                </a>
              </nav>

              {/* Desktop Right Side Actions for Landing Page */}
              <div className="hidden md:flex items-center gap-3">
                {!currentUser.authenticated ? (
                  <>
                    <Link
                      href="/teacher/login"
                      className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:text-[#4F46E5] hover:bg-[#F8FAFC] rounded-xl transition-colors"
                    >
                      Teacher Portal
                    </Link>
                    <Link
                      href="/student/login"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-2xs transition-all hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Student Face Sign-In</span>
                    </Link>
                  </>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={dashboardHref}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-2xs transition-colors"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
                      {isTeacher ? (
                        <GraduationCap className="h-3.5 w-3.5 text-[#4F46E5]" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5 text-[#047857]" />
                      )}
                      <span className="text-xs font-medium text-[#0F172A] max-w-[130px] truncate">
                        {(currentUser.user as any)?.name || (currentUser.role === "teacher" ? "Faculty" : "Student")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={logout}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                      title="Sign out"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* On /teacher and /student pages: show ONLY Home, Dashboard and Logout */
            <nav className="hidden md:flex items-center gap-2">
              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
              >
                Home
              </Link>
              {currentUser.authenticated ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <Link
                  href={pathname.startsWith("/teacher") ? "/teacher/login" : "/student/login"}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF]"
                >
                  Sign In
                </Link>
              )}
            </nav>
          )}

          {/* Mobile Menu Toggle Button (<768px) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] border border-[#E2E8F0] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (<768px) */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#E2E8F0] space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            {isHomePage ? (
              <>
                <div className="flex flex-col space-y-1">
                  <a
                    href="#top"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                      activeSection === "top"
                        ? "text-[#4F46E5] bg-[#EEF2FF]"
                        : "text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    Home
                  </a>
                  <a
                    href="#features"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                      activeSection === "features"
                        ? "text-[#4F46E5] bg-[#EEF2FF]"
                        : "text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    Features
                  </a>
                  <a
                    href="#teachers"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                      activeSection === "teachers"
                        ? "text-[#4F46E5] bg-[#EEF2FF]"
                        : "text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    Teacher Journey
                  </a>
                  <a
                    href="#students"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                      activeSection === "students"
                        ? "text-[#4F46E5] bg-[#EEF2FF]"
                        : "text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    Students
                  </a>
                  <a
                    href="#tech"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                      activeSection === "tech"
                        ? "text-[#4F46E5] bg-[#EEF2FF]"
                        : "text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    Tech Stack
                  </a>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                  {!currentUser.authenticated ? (
                    <>
                      <Link
                        href="/teacher/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-semibold border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]"
                      >
                        Teacher Portal
                      </Link>
                      <Link
                        href="/student/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-2xs"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Student Face Sign-In</span>
                      </Link>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Link
                        href={dashboardHref}
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#4F46E5] text-white"
                      >
                        <span>Go to Dashboard</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold text-[#B91C1C] hover:bg-[#FEF2F2]"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* On /teacher and /student mobile: show ONLY Home, Dashboard, and Logout */
              <div className="flex flex-col space-y-2">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Home
                </Link>
                {currentUser.authenticated ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-xl text-sm font-semibold text-[#4F46E5] bg-[#EEF2FF]"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href={pathname.startsWith("/teacher") ? "/teacher/login" : "/student/login"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-xl text-sm font-semibold text-[#4F46E5] bg-[#EEF2FF]"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
