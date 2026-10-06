"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Subject } from "@/types";
import { GraduationCap, Camera, BookOpen, BarChart3, Plus, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import TakeAttendanceTab from "@/components/teacher/TakeAttendanceTab";
import ManageSubjectsTab from "@/components/teacher/ManageSubjectsTab";
import AttendanceRecordsTab from "@/components/teacher/AttendanceRecordsTab";
import CreateSubjectModal from "@/components/teacher/CreateSubjectModal";

export default function TeacherDashboard() {
  const router = useRouter();
  const { currentUser, isLoading, isTeacher } = useAuth();

  const [activeTab, setActiveTab] = useState<"attendance" | "subjects" | "records">("attendance");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

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

  if (isLoading || !isTeacher) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#4F46E5] animate-spin mb-2" />
        <p className="text-xs text-[#64748B]">Verifying faculty credentials…</p>
      </div>
    );
  }

  const teacher = currentUser.user as any;

  return (
    <div className="space-y-6">
      {/* Teacher Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0F172A]">
                Welcome, {teacher?.name || teacher?.username || "Instructor"}
              </h1>
              <StatusBadge status="success">Verified Faculty</StatusBadge>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Faculty ID #{teacher?.teacher_id} &bull; {subjects.length} Active{" "}
              {subjects.length === 1 ? "Course" : "Courses"} Managed
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setQuickCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] shadow-2xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Course</span>
        </button>
      </div>

      {/* Segmented Tab Navigation Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "attendance"
              ? "bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] shadow-2xs"
              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>Take Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("subjects")}
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "subjects"
              ? "bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] shadow-2xs"
              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Manage Courses ({subjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("records")}
          className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "records"
              ? "bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] shadow-2xs"
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
