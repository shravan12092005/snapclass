"use client";

import React, { useState, useMemo } from "react";
import { Subject } from "@/types";
import {
  BookOpen,
  Plus,
  Users,
  Clock,
  Share2,
  Trash2,
  Copy,
  Check,
  Search,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import CreateSubjectModal from "./CreateSubjectModal";
import ShareSubjectModal from "./ShareSubjectModal";
import DeleteSubjectModal from "./DeleteSubjectModal";
import SubjectRosterModal from "./SubjectRosterModal";

interface ManageSubjectsTabProps {
  subjects: Subject[];
  onRefreshSubjects: () => void;
}

export default function ManageSubjectsTab({
  subjects,
  onRefreshSubjects,
}: ManageSubjectsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareSubject, setShareSubject] = useState<Subject | null>(null);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [rosterSubject, setRosterSubject] = useState<Subject | null>(null);

  const handleCopyCode = async (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(subject.subject_code);
      setCopiedCodeId(subject.subject_id);
      setTimeout(() => setCopiedCodeId(null), 1800);
    } catch {}
  };

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const q = searchQuery.toLowerCase();
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q) ||
        s.subject_code.toLowerCase().includes(q)
    );
  }, [subjects, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Tab Header Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">Course Management</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage your courses, view enrolled student rosters, and generate share links
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search courses…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:outline-none focus:border-[#4F46E5] text-[#0F172A]"
            />
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Course</span>
          </button>
        </div>
      </div>

      {/* Courses Grid */}
      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5] mx-auto mb-3">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">No Courses Created Yet</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1 mb-4">
            Create your first course to begin registering students, tracking attendance, and analyzing roll call logs.
          </p>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] shadow-2xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Course</span>
          </button>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center text-xs text-[#64748B]">
          No courses match &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSubjects.map((sub) => (
            <div
              key={sub.subject_id}
              className="bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#CBD5E1] p-5 shadow-xs transition-all flex flex-col justify-between gap-4"
            >
              <div>
                {/* Header: Title + Section badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A] leading-snug">{sub.name}</h3>
                    <div className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] text-[11px] font-semibold">
                      Section {sub.section}
                    </div>
                  </div>

                  {/* Course Code Copy Pill */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyCode(sub, e)}
                    className="group px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EEF2FF] text-[11px] font-mono font-bold text-[#0F172A] flex items-center gap-1.5 transition-colors shrink-0"
                    title="Click to copy course code"
                  >
                    <span>{sub.subject_code}</span>
                    {copiedCodeId === sub.subject_id ? (
                      <Check className="h-3.5 w-3.5 text-[#047857]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-[#64748B] group-hover:text-[#4F46E5]" />
                    )}
                  </button>
                </div>

                {/* KPI stats */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-[#64748B]">
                      <Users className="h-3.5 w-3.5" />
                      <span>Students</span>
                    </div>
                    <div className="text-lg font-bold text-[#0F172A] mt-0.5">
                      {sub.total_students}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-[#64748B]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Classes</span>
                    </div>
                    <div className="text-lg font-bold text-[#0F172A] mt-0.5">
                      {sub.total_classes}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setRosterSubject(sub)}
                  className="w-full py-2 px-3 rounded-xl bg-[#F8FAFC] hover:bg-[#EEF2FF] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:text-[#4F46E5] flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-[#4F46E5]" />
                    <span>View Class Roster ({sub.total_students})</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#64748B]" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShareSubject(sub)}
                    className="flex-1 py-1.5 px-3 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF]/60 hover:bg-[#EEF2FF] text-[#4F46E5] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Share Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteSubject(sub)}
                    className="py-1.5 px-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2]/60 hover:bg-[#FEF2F2] text-[#B91C1C] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    title="Delete course"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateSubjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubjectCreated={onRefreshSubjects}
      />

      <ShareSubjectModal
        isOpen={Boolean(shareSubject)}
        onClose={() => setShareSubject(null)}
        subject={shareSubject}
      />

      <DeleteSubjectModal
        isOpen={Boolean(deleteSubject)}
        onClose={() => setDeleteSubject(null)}
        subject={deleteSubject}
        onSubjectDeleted={onRefreshSubjects}
      />

      <SubjectRosterModal
        isOpen={Boolean(rosterSubject)}
        onClose={() => setRosterSubject(null)}
        subject={rosterSubject}
        onRosterChanged={onRefreshSubjects}
      />
    </div>
  );
}
