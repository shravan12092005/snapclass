"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { X, Plus, BookOpen, Loader2, AlertCircle } from "lucide-react";

interface CreateSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubjectCreated: () => void;
}

export default function CreateSubjectModal({
  isOpen,
  onClose,
  onSubjectCreated,
}: CreateSubjectModalProps) {
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !section.trim()) {
      setErrorMsg("Please fill in both the Course Name and Section.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      await api.createSubject(name.trim(), section.trim());
      setName("");
      setSection("");
      onSubjectCreated();
      onClose();
    } catch (err: any) {
      if (err.status === 403) {
        setErrorMsg(
          "Teacher session required. Your active login in this browser is currently a student account (e.g. from logging into the student portal in another tab). Please sign in as a faculty member again."
        );
      } else {
        setErrorMsg(err.message || "Failed to create subject. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Create New Course</h2>
              <p className="text-xs text-[#64748B]">Enrollment code will be automatically generated</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#B91C1C]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="course-name-input" className="text-xs font-semibold text-[#0F172A]">Course Name</label>
            <input
              id="course-name-input"
              type="text"
              placeholder="e.g. Introduction to Computer Science"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="section-input" className="text-xs font-semibold text-[#0F172A]">Section / Batch</label>
            <input
              id="section-input"
              type="text"
              placeholder="e.g. Section A or Fall 2026"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !section.trim()}
              className="px-5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating…</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Course</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
