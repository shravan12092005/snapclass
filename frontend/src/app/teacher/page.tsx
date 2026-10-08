"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Subject } from "@/types";
import { GraduationCap, Camera, BookOpen, BarChart3, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import TakeAttendanceTab from "@/components/teacher/TakeAttendanceTab";
import ManageSubjectsTab from "@/components/teacher/ManageSubjectsTab";
import AttendanceRecordsTab from "@/components/teacher/AttendanceRecordsTab";
import CreateSubjectModal from "@/components/teacher/CreateSubjectModal";
import { DashboardSkeleton } from "@/components/Skeleton";

function TeacherDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, isLoading, isTeacher } = useAuth();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"attendance" | "subjects" | "records">(
    tabParam === "courses" || tabParam === "subjects"
      ? "subjects"
      : tabParam === "records"
      ? "records"
      : "attendance"
  );
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  useEffect(() => {
    if (tabParam === "courses" || tabParam === "subjects") {
      setActiveTab("subjects");
    } else if (tabParam === "records") {
      setActiveTab("records");
    } else if (tabParam === "attendance") {
      setActiveTab("attendance");
    }
  }, [tabParam]);

  // Authentication guard
  useEffect(() => {
    if (!isLoading && (!currentUser.authenticated || currentUser.role !== "teacher")) {
      router.push("/teacher/login");
    }
  }, [currentUser, isLoading, router]);

  // Load teacher subjects
  const fetchSubjects = useCallback(async () => {
    if (!currentUser.authenticated || currentUser.role !== "teacher") return;
    setIsLoadingSubjects(true);
    try {
      const data = await api.getSubjects();
      setSubjects(data);
    } catch {
      // handled
    } finally {
      setIsLoadingSubjects(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser.authenticated && currentUser.role === "teacher") {
      fetchSubjects();
    }
  }, [currentUser, fetchSubjects]);

  if (isLoading || !isTeacher || isLoadingSubjects) {
    return <DashboardSkeleton />;
  }

  const teacher = currentUser.user as any;

  return (
    <div className="space-y-6">
      {/* Teacher Header Banner - Compact One Line */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5] shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg font-bold text-[#0F172A]">
              Welcome, {teacher?.name || teacher?.username || "Instructor"}
            </h1>
            <span className="text-[#94A3B8] text-xs">&bull;</span>
            <span className="text-xs font-medium text-[#64748B]">
              {subjects.length} {subjects.length === 1 ? "course" : "courses"}
            </span>
            <StatusBadge status="success">Verified Faculty</StatusBadge>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation Bar - Scrollable on small screens */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-1.5 flex overflow-x-auto gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
            activeTab === "attendance"
              ? "bg-[#EEF2FF] text-[#4F46E5] shadow-xs"
              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>Take Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("subjects")}
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
            activeTab === "subjects"
              ? "bg-[#EEF2FF] text-[#4F46E5] shadow-xs"
              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Manage Courses ({subjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("records")}
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
            activeTab === "records"
              ? "bg-[#EEF2FF] text-[#4F46E5] shadow-xs"
              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Attendance Records & Analytics</span>
        </button>
      </div>

      {/* Tab Panels */}
      {isLoadingSubjects ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <Loader2 className="h-6 w-6 text-[#4F46E5] animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#64748B]">Loading faculty courses…</p>
        </div>
      ) : (
        <>
          {activeTab === "attendance" && (
            <TakeAttendanceTab
              subjects={subjects}
              onNavigateToSubjects={() => setActiveTab("subjects")}
              onAttendanceSaved={fetchSubjects}
            />
          )}

          {activeTab === "subjects" && (
            <ManageSubjectsTab
              subjects={subjects}
              onRefreshSubjects={fetchSubjects}
            />
          )}

          {activeTab === "records" && <AttendanceRecordsTab />}
        </>
      )}

      {/* Quick Course Create Modal */}
      <CreateSubjectModal
        isOpen={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onSubjectCreated={fetchSubjects}
      />
    </div>
  );
}

export default function TeacherDashboard() {
  return (
    <React.Suspense fallback={<DashboardSkeleton />}>
      <TeacherDashboardContent />
    </React.Suspense>
  );
}
