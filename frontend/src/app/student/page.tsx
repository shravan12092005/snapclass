"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { StudentDashboardSubject } from "@/types";
import {
  UserCheck,
  BookOpen,
  Plus,
  Loader2,
  Calendar,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Trash2,
  LogOut,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { getAttendanceRateInfo } from "@/lib/rateColor";
import EnrollModal from "@/components/student/EnrollModal";
import UnenrollModal from "@/components/student/UnenrollModal";
import DeleteProfileModal from "@/components/student/DeleteProfileModal";

function StudentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, isLoading, isStudent } = useAuth();

  const [subjects, setSubjects] = useState<StudentDashboardSubject[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  // Modals state
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [initialEnrollCode, setInitialEnrollCode] = useState("");
  const [unenrollSubject, setUnenrollSubject] = useState<StudentDashboardSubject | null>(null);
  const [deleteProfileOpen, setDeleteProfileOpen] = useState(false);
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

  const handleCopyCode = async (code: string, id: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch {}
  };

  // Authentication guard
  useEffect(() => {
    if (!isLoading && (!currentUser.authenticated || currentUser.role !== "student")) {
      router.push("/student/login");
    }
  }, [currentUser, isLoading, router]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!currentUser.authenticated || currentUser.role !== "student") return;
    setIsLoadingDashboard(true);
    try {
      const resp = await api.getStudentDashboard();
      setSubjects(resp.subjects || []);
    } catch {
      // handled
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser.authenticated && currentUser.role === "student") {
      fetchDashboard();
    }
  }, [currentUser, fetchDashboard]);

  // Handle URL join-code parameter (e.g. from QR scan / landing page)
  useEffect(() => {
    const joinCode = searchParams.get("join-code");
    if (joinCode) {
      setInitialEnrollCode(joinCode);
      setEnrollModalOpen(true);
    }
  }, [searchParams]);

  // Derived aggregate metrics
  const totalCourses = subjects.length;
  const totalClasses = useMemo(() => subjects.reduce((acc, s) => acc + s.total, 0), [subjects]);
  const totalAttended = useMemo(() => subjects.reduce((acc, s) => acc + s.attended, 0), [subjects]);
  const overallRate = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;

  if (isLoading || !isStudent) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#4F46E5] animate-spin mb-2" />
        <p className="text-xs text-[#64748B]">Verifying student session…</p>
      </div>
    );
  }

  const student = currentUser.user as any;

  return (
    <div className="space-y-6">
      {/* Student Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0F172A]">
                Welcome, {student?.name || "Student"}
              </h1>
              <StatusBadge status="success">Biometric Verified</StatusBadge>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Student ID #{student?.student_id} &bull; {totalCourses} Active{" "}
              {totalCourses === 1 ? "Course" : "Courses"} Enrolled
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setInitialEnrollCode("");
            setEnrollModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] shadow-2xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Enroll in Course</span>
        </button>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Enrolled Courses</span>
            <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">{totalCourses}</div>
          <p className="text-[11px] text-[#64748B] mt-1">Active class memberships</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Classes Attended</span>
            <div className="p-2 rounded-xl bg-[#ECFDF5] text-[#047857]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#047857] mt-2">
            {totalAttended} <span className="text-xs font-normal text-[#64748B]">/ {totalClasses}</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Total verified roll-calls</p>
        </div>

        {/* Overall Attendance KPI */}
        {(() => {
          const overallRateInfo = getAttendanceRateInfo(overallRate, totalClasses);
          return (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Overall Attendance</span>
                <div className={`p-2 rounded-xl ${overallRateInfo.bgClass} ${overallRateInfo.textClass}`}>
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className={`text-2xl font-bold ${overallRateInfo.textClass} mt-2`}>
                {overallRateInfo.label}
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">Cumulative attendance rate</p>
            </div>
          );
        })()}
      </div>

      {/* Enrolled Courses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F172A]">Your Enrolled Courses</h2>
          <span className="text-xs text-[#64748B]">{subjects.length} active</span>
        </div>

        {isLoadingDashboard ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
            <Loader2 className="h-6 w-6 text-[#4F46E5] animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#64748B]">Loading your courses…</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5] mx-auto mb-2">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">Not Enrolled in Any Courses Yet</h3>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              Get the course code from your instructor to enroll, or scan their classroom QR code.
            </p>
            <button
              type="button"
              onClick={() => {
                setInitialEnrollCode("");
                setEnrollModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] shadow-2xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
            >
              <Plus className="h-4 w-4" />
              <span>Enroll with Course Code</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((sub) => {
              const rateInfo = getAttendanceRateInfo(sub.rate, sub.total);
              const progressColor =
                rateInfo.status === "success"
                  ? "bg-[#047857]"
                  : rateInfo.status === "warning"
                  ? "bg-[#B45309]"
                  : rateInfo.status === "danger"
                  ? "bg-[#B91C1C]"
                  : "bg-[#94A3B8]";

              return (
                <div
                  key={sub.subject_id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#CBD5E1] p-5 shadow-xs transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    {/* Header: Exact course name without title-case enforcement */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-[#0F172A] leading-snug">{sub.name}</h3>
                        {sub.section && (
                          <div className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] text-[11px] font-semibold">
                            Section {sub.section}
                          </div>
                        )}
                      </div>

                      {/* Course Code Monospace with Slashed-Zero & Copy Button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-mono font-bold tracking-wider text-[#0F172A]">
                          {sub.subject_code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(sub.subject_code, sub.subject_id)}
                          className="p-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EEF2FF] text-[#64748B] hover:text-[#4F46E5] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
                          title="Copy course code"
                        >
                          {copiedCodeId === sub.subject_id ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#047857] px-0.5">
                              <Check className="h-3 w-3" />
                              <span>Copied</span>
                            </span>
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-[#64748B]">
                          <Calendar className="h-3 w-3" />
                          <span>Total</span>
                        </div>
                        <div className="text-base font-bold text-[#0F172A] mt-0.5">{sub.total}</div>
                      </div>

                      <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-[#047857]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Attended</span>
                        </div>
                        <div className="text-base font-bold text-[#047857] mt-0.5">{sub.attended}</div>
                      </div>

                      <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-[#64748B]">
                          <TrendingUp className="h-3 w-3" />
                          <span>Rate</span>
                        </div>
                        <div className="mt-0.5">
                          <StatusBadge status={rateInfo.status}>{rateInfo.label}</StatusBadge>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar with "X of Y classes" next to percentage */}
                    <div className="mt-4 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748B]">
                        <span>Attendance Progress</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${rateInfo.textClass}`}>{rateInfo.label}</span>
                          <span>
                            ({sub.attended} of {sub.total} {sub.total === 1 ? "class" : "classes"})
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                          style={{ width: `${Math.min(100, Math.max(0, sub.rate))}%` }}
                        />
                      </div>
                    </div>

                    {/* Low Attendance Warning: ONLY when total >= 3 and rate < 75% */}
                    {sub.total >= 3 && sub.rate < 75 && (
                      <div className="mt-3 p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center gap-2 text-xs text-[#B45309]">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>
                          Low attendance warning: {sub.attended} of {sub.total} classes ({sub.rate.toFixed(1)}%). Rate is below 75%.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#F1F5F9] flex justify-end">
                    <button
                      type="button"
                      onClick={() => setUnenrollSubject(sub)}
                      className="text-xs font-semibold text-[#64748B] hover:text-[#B91C1C] flex items-center gap-1.5 transition-colors p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Unenroll from this course</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger Zone Accordion */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setDangerZoneOpen((prev) => !prev)}
          className="w-full px-6 py-4 flex items-center justify-between bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 text-xs font-bold text-[#B91C1C]">
            <AlertTriangle className="h-4 w-4 text-[#B91C1C]" />
            <span>Danger Zone &bull; Biometric Profile Deletion</span>
          </div>
          {dangerZoneOpen ? (
            <ChevronUp className="h-4 w-4 text-[#64748B]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#64748B]" />
          )}
        </button>

        {dangerZoneOpen && (
          <div className="p-6 space-y-4 border-t border-[#E2E8F0]">
            <p className="text-xs text-[#64748B] leading-relaxed">
              Permanently delete your student account, face embeddings, voice biometric sample, course
              memberships, and all historical classroom attendance records.
            </p>
            <button
              type="button"
              onClick={() => setDeleteProfileOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-xs font-bold transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete my profile and data</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <EnrollModal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        initialCode={initialEnrollCode}
        onEnrolled={fetchDashboard}
      />

      <UnenrollModal
        isOpen={Boolean(unenrollSubject)}
        onClose={() => setUnenrollSubject(null)}
        subject={unenrollSubject}
        onUnenrolled={fetchDashboard}
      />

      <DeleteProfileModal
        isOpen={deleteProfileOpen}
        onClose={() => setDeleteProfileOpen(false)}
        studentName={student?.name || "Student"}
      />
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#4F46E5] animate-spin mb-2" />
          <p className="text-xs text-[#64748B]">Loading student dashboard…</p>
        </div>
      }
    >
      <StudentDashboardContent />
    </Suspense>
  );
}
