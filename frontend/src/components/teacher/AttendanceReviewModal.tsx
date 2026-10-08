"use client";

import React, { useState, useMemo } from "react";
import { AttendanceLogEntry, AttendanceResultEntry } from "@/types";
import { api } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Check,
  X,
  Users,
  ShieldCheck,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import { useProcessing } from "@/hooks/useProcessing";

interface AttendanceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: AttendanceResultEntry[];
  initialLogs: AttendanceLogEntry[];
  subjectName: string;
  onSaved: () => void;
}

export default function AttendanceReviewModal({
  isOpen,
  onClose,
  results,
  initialLogs,
  subjectName,
  onSaved,
}: AttendanceReviewModalProps) {
  // Local state for interactive overrides
  const [logs, setLogs] = useState<AttendanceLogEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "present" | "absent" | "no_profile">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    isProcessing,
    title,
    subMessage,
    elapsedSeconds,
    uploadPercent,
    allowCancel,
    isTimedOut,
    successMessage,
    startProcessing,
    stopProcessing,
    showSuccess,
    cancel,
    retry,
  } = useProcessing();

  // Map student_id to result metadata (Name, Source, original Status)
  const resultMap = useMemo(() => {
    const map = new Map<number, AttendanceResultEntry>();
    for (const r of results) {
      map.set(r.ID, r);
    }
    return map;
  }, [results]);

  // Sync if initialLogs or results change: guarantee ALL enrolled students in results are present in logs
  React.useEffect(() => {
    const logMap = new Map<number, AttendanceLogEntry>();
    for (const l of initialLogs) {
      logMap.set(l.student_id, l);
    }

    const subjectId = initialLogs[0]?.subject_id || 0;
    const timestamp = initialLogs[0]?.timestamp || new Date().toISOString();

    const mergedLogs: AttendanceLogEntry[] = results.map((r) => {
      const existing = logMap.get(r.ID);
      if (existing) return existing;
      return {
        student_id: r.ID,
        subject_id: subjectId,
        timestamp: timestamp,
        is_present: false,
      };
    });

    setLogs(mergedLogs);
  }, [results, initialLogs]);

  // Derived metrics
  const totalCount = logs.length;
  const presentCount = useMemo(() => logs.filter((l) => l.is_present).length, [logs]);
  const noProfileCount = useMemo(() => {
    return logs.filter((l) => {
      const res = resultMap.get(l.student_id);
      return !l.is_present && Boolean(res?.Status?.includes("No voice profile"));
    }).length;
  }, [logs, resultMap]);
  const absentCount = useMemo(() => {
    return logs.filter((l) => {
      const res = resultMap.get(l.student_id);
      const isNoProf = Boolean(res?.Status?.includes("No voice profile"));
      return !l.is_present && !isNoProf;
    }).length;
  }, [logs, resultMap]);
  const presentPct = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

  // Toggle student status
  const handleToggleStatus = (studentId: number) => {
    setLogs((prev) =>
      prev.map((log) => {
        if (log.student_id === studentId) {
          return { ...log, is_present: !log.is_present };
        }
        return log;
      })
    );
  };

  // Filtered list
  const filteredStudents = useMemo(() => {
    return logs.filter((log) => {
      const res = resultMap.get(log.student_id);
      const name = res?.Name || `Student #${log.student_id}`;
      const isNoProfile = Boolean(res?.Status?.includes("No voice profile"));

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = name.toLowerCase().includes(query);
        const matchesId = String(log.student_id).includes(query);
        if (!matchesName && !matchesId) return false;
      }

      // Filter tab match
      if (filter === "present") return log.is_present;
      if (filter === "absent") return !log.is_present && !isNoProfile;
      if (filter === "no_profile") return !log.is_present && isNoProfile;
      return true;
    });
  }, [logs, resultMap, filter, searchQuery]);

  // Save to DB
  const handleConfirmSave = async () => {
    setErrorMsg("");
    const signal = startProcessing({
      title: "Saving Attendance",
      steps: ["Saving attendance…"],
      allowCancel: false,
    });

    try {
      // Exclude students who had no voice profile and remained untoggled,
      // so they aren't falsely recorded as absent in attendance logs.
      const logsToSave = logs.filter((log) => {
        const res = resultMap.get(log.student_id);
        const isNoProfile = Boolean(res?.Status?.includes("No voice profile"));
        if (isNoProfile && !log.is_present) {
          return false;
        }
        return true;
      });

      if (logsToSave.length > 0) {
        await api.saveAttendance(logsToSave, { signal });
      }
      await showSuccess("Attendance session saved!", 600);
      onSaved();
      onClose();
    } catch (err: any) {
      stopProcessing();
      setErrorMsg(err.message || "Failed to save attendance logs. Please retry.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
        {/* Processing Feedback Overlay */}
        <ProcessingOverlay
          isProcessing={isProcessing}
          title={title}
          subMessage={subMessage}
          elapsedSeconds={elapsedSeconds}
          uploadPercent={uploadPercent}
          allowCancel={allowCancel}
          isTimedOut={isTimedOut}
          successMessage={successMessage}
          onCancel={cancel}
          onRetry={retry}
        />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Attendance Review</h2>
              <p className="text-xs text-[#64748B]">
                {subjectName} &bull; Review AI detection results and manually toggle if needed
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
            aria-label="Close review modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content / Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#B91C1C]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* KPI Summary Card */}
          <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-4 space-y-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg border border-[#E2E8F0]">
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#64748B]">
                  <Users className="h-3.5 w-3.5" />
                  <span>Total Students</span>
                </div>
                <div className="text-2xl font-bold text-[#0F172A] mt-1">{totalCount}</div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-[#E2E8F0]">
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#047857]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Present</span>
                </div>
                <div className="text-2xl font-bold text-[#047857] mt-1">{presentCount}</div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-[#E2E8F0]">
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#B91C1C]">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Absent</span>
                </div>
                <div className="text-2xl font-bold text-[#B91C1C] mt-1">{absentCount}</div>
              </div>
            </div>

            {/* Attendance Rate Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-[#0F172A]">
                <span>Attendance Rate</span>
                <span>{presentPct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#047857] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, presentPct))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === "all"
                    ? "bg-white text-[#4F46E5] shadow-xs border border-[#C7D2FE]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("present")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === "present"
                    ? "bg-white text-[#047857] shadow-xs border border-[#A7F3D0]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Present ({presentCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter("absent")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === "absent"
                    ? "bg-white text-[#B91C1C] shadow-xs border border-[#FECACA]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Absent ({absentCount})
              </button>
              {noProfileCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("no_profile")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filter === "no_profile"
                      ? "bg-white text-[#B45309] shadow-xs border border-[#FDE68A]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  No Profile ({noProfileCount})
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search student…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] text-[#0F172A]"
              />
            </div>
          </div>

          {/* Unprofiled Students Warning Banner */}
          {noProfileCount > 0 && (
            <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center gap-2 text-xs text-[#B45309]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {noProfileCount} enrolled student{noProfileCount > 1 ? "s do" : " does"} not have a voice profile yet. You can manually verify and mark them present below.
              </span>
            </div>
          )}

          {/* Student Cards Grid */}
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#E2E8F0] rounded-xl">
              <p className="text-xs text-[#64748B]">No students match your filter or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStudents.map((log) => {
                const res = resultMap.get(log.student_id);
                const name = res?.Name || `Student #${log.student_id}`;
                const source = res?.Source || "Manual";
                const isNoProfile = res?.Status?.includes("No voice profile");

                return (
                  <div
                    key={log.student_id}
                    className={`rounded-xl border p-4 transition-all flex flex-col justify-between gap-3 ${
                      log.is_present
                        ? "bg-[#ECFDF5]/40 border-[#A7F3D0]"
                        : isNoProfile
                        ? "bg-[#FFFBEB]/40 border-[#FDE68A]"
                        : "bg-[#FEF2F2]/40 border-[#FECACA]"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-[#0F172A] truncate" title={name}>
                            {name}
                          </div>
                          <div className="text-[11px] text-[#64748B]">ID #{log.student_id}</div>
                        </div>

                        {log.is_present ? (
                          <StatusBadge status="success">Present</StatusBadge>
                        ) : isNoProfile ? (
                          <StatusBadge status="warning">No Profile</StatusBadge>
                        ) : (
                          <StatusBadge status="danger">Absent</StatusBadge>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#64748B]">
                        <span className="font-medium">Detected via:</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/80 border border-[#E2E8F0] text-[#0F172A] font-medium text-[10px]">
                          {source}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(log.student_id)}
                      disabled={isProcessing}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        log.is_present
                          ? "bg-white text-[#B91C1C] border border-[#FECACA] hover:bg-[#FEF2F2]"
                          : "bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-2xs"
                      }`}
                    >
                      {log.is_present ? (
                        <>
                          <X className="h-3.5 w-3.5" />
                          <span>Mark Absent</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Mark Present</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] transition-colors disabled:opacity-50"
          >
            Discard Session
          </button>

          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={isProcessing}
            className="w-full sm:w-auto px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] shadow-2xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
          >
            <Check className="h-4 w-4" />
            <span>Confirm & Save Attendance</span>
          </button>
        </div>
      </div>
    </div>
  );
}
