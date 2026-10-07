"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { Subject, RosterEntry } from "@/types";
import { X, Users, Search, Trash2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { getAttendanceRateInfo } from "@/lib/rateColor";

interface SubjectRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  onRosterChanged: () => void;
}

export default function SubjectRosterModal({
  isOpen,
  onClose,
  subject,
  onRosterChanged,
}: SubjectRosterModalProps) {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchRoster = useCallback(async () => {
    if (!subject) return;
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await api.getRoster(subject.subject_id);
      setRoster(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load class roster.");
    } finally {
      setIsLoading(false);
    }
  }, [subject]);

  useEffect(() => {
    if (isOpen && subject) {
      fetchRoster();
    }
  }, [isOpen, subject, fetchRoster]);

  const handleRemoveStudent = async (studentId: number, studentName: string) => {
    if (!subject) return;
    if (!confirm(`Are you sure you want to remove ${studentName} from this course?`)) return;

    setRemovingId(studentId);
    setErrorMsg("");
    try {
      await api.removeRosterStudent(subject.subject_id, studentId);
      await fetchRoster();
      onRosterChanged();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove student from course.");
    } finally {
      setRemovingId(null);
    }
  };

  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return roster;
    const q = searchQuery.toLowerCase();
    return roster.filter(
      (r) => r.Name.toLowerCase().includes(q) || String(r.ID).includes(q)
    );
  }, [roster, searchQuery]);

  if (!isOpen || !subject) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Class Roster</h2>
              <p className="text-xs text-[#64748B]">
                {subject.name} &bull; Section {subject.section} ({roster.length} enrolled)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-[#E2E8F0] bg-white flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by student name or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5] text-[#0F172A]"
            />
          </div>
          <button
            type="button"
            onClick={fetchRoster}
            disabled={isLoading}
            className="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
            title="Refresh roster"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#B91C1C]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#64748B]">
              <Loader2 className="h-6 w-6 text-[#4F46E5] animate-spin mb-2" />
              <p className="text-xs">Loading roster data…</p>
            </div>
          ) : roster.length === 0 ? (
            <div className="py-12 text-center text-[#64748B]">
              <p className="text-xs">No students have enrolled in this course yet.</p>
              <p className="text-[11px] mt-1 text-[#94A3B8]">Share the course code or QR link with your students to get started.</p>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#64748B]">
              No students match &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 font-semibold">Student</th>
                    <th className="py-2.5 px-3 font-semibold">Classes Attended</th>
                    <th className="py-2.5 px-3 font-semibold">Attendance Rate</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredRoster.map((entry) => {
                    const rateNum = parseFloat(entry.Rate.replace("%", "")) || 0;
                    const attendedParts = entry.Attended.split("/");
                    const totalClassesForStudent = attendedParts.length > 1 ? parseInt(attendedParts[1]) || 0 : (subject.total_classes || 0);
                    const rateInfo = getAttendanceRateInfo(rateNum, totalClassesForStudent);

                    return (
                      <tr key={entry.ID} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-3 font-medium text-[#0F172A]">
                          <div>{entry.Name}</div>
                          <div className="text-[10px] text-[#64748B]">ID #{entry.ID}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[#0F172A]">{entry.Attended}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={rateInfo.status}>{rateInfo.label}</StatusBadge>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(entry.ID, entry.Name)}
                            disabled={removingId === entry.ID}
                            className="p-1.5 rounded-lg text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
                            title="Remove student from roster"
                          >
                            {removingId === entry.ID ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
