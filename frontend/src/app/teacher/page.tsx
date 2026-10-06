"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { GraduationCap, Camera, BookOpen, BarChart3, Plus, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

export default function TeacherDashboardShell() {
  const router = useRouter();
  const { currentUser, isLoading, isTeacher } = useAuth();

  useEffect(() => {
    if (!isLoading && (!currentUser.authenticated || currentUser.role !== "teacher")) {
      router.push("/teacher/login");
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !isTeacher) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#4F46E5] animate-spin mb-2" />
        <p className="text-xs text-[#64748B]">Verifying teacher authorization…</p>
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
              Faculty ID #{teacher?.teacher_id} &bull; Manage courses and take verified attendance
            </p>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] shadow-2xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Course</span>
        </button>
      </div>

      {/* Segmented Tab Navigation Shell (Ready for Phase C) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="border-b border-[#E2E8F0] px-6 py-3 bg-[#F8FAFC] flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-[#4F46E5] border border-[#C7D2FE] shadow-2xs"
          >
            <Camera className="h-4 w-4" />
            <span>Take Attendance</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-white transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Manage Subjects</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-white transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Attendance Records</span>
          </button>
        </div>

        <div className="p-8 text-center">
          <div className="inline-flex p-3 rounded-full bg-[#EEF2FF] text-[#4F46E5] mb-3">
            <Camera className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A]">Phase B Shell Ready</h2>
          <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
            Teacher authentication and session verification are fully operational. Full interactive
            photo review modal, voice scan, and analytics charts will be populated in Phase C.
          </p>
        </div>
      </div>
    </div>
  );
}
