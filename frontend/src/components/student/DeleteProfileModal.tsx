"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { X, Trash2, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";

interface DeleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
}

export default function DeleteProfileModal({
  isOpen,
  onClose,
  studentName,
}: DeleteProfileModalProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!confirmed) return;
    setIsDeleting(true);
    setErrorMsg("");

    try {
      await api.deleteStudentProfile();
      await logout();
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete student profile. Please retry.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#FECACA] shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-[#FECACA] flex items-center justify-between bg-[#FEF2F2]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center text-[#B91C1C]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Delete Biometric Profile?</h2>
              <p className="text-xs text-[#B91C1C]">Permanent and irreversible action</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#B91C1C]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <p className="text-xs text-[#0F172A] leading-relaxed">
            Are you sure you want to delete the student profile for{" "}
            <strong className="text-[#0F172A]">{studentName}</strong>?
          </p>

          <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#B45309] space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-[#92400E]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>What will be deleted:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#92400E]">
              <li>Your facial biometric vector & voice embedding vectors</li>
              <li>All current course enrollments</li>
              <li>All historical classroom attendance verification logs</li>
              <li>Face identification model will retrain without your identity</li>
            </ul>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-[#CBD5E1] text-[#B91C1C] focus:ring-[#B91C1C]"
            />
            <span className="text-xs text-[#0F172A] font-medium leading-tight">
              I understand this action is permanent and cannot be undone.
            </span>
          </label>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || !confirmed}
              className="px-5 py-2 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting Data…</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
