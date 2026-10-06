"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserCheck, BookOpen, Loader2, Award, Calendar } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

export default function StudentDashboardShell() {
  const router = useRouter();
  const { currentUser, isLoading, isStudent } = useAuth();

  useEffect(() => {
    if (!isLoading && (!currentUser.authenticated || currentUser.role !== "student")) {
      router.push("/student/login");
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !isStudent) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#4F46E5] animate-spin mb-2" />
        <p className="text-xs text-[#64748B]">Verifying student authorization…</p>
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
              Student ID #{student?.student_id} &bull; Active biometric profile
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Content Shell */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-8 text-center">
        <div className="inline-flex p-3 rounded-full bg-[#ECFDF5] text-[#047857] mb-3">
          <BookOpen className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0F172A]">Phase B Shell Ready</h2>
        <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
          Student authentication and biometric session cookies are active. Enrolled subject cards,
          attendance rates, unenrollment, and self-deletion will be wired in Phase D.
        </p>
      </div>
    </div>
  );
}
