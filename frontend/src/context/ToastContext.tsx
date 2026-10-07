"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((msg: string) => showToast(msg, "success"), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, "error"), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error }}>
      {children}

      {/* Floating Toast Container */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg flex items-start gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              toast.type === "success"
                ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]"
                : toast.type === "error"
                ? "bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]"
                : "bg-white border-[#E2E8F0] text-[#0F172A]"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#047857] mt-0.5" />}
            {toast.type === "error" && <AlertCircle className="h-4 w-4 shrink-0 text-[#B91C1C] mt-0.5" />}
            {toast.type === "info" && <Info className="h-4 w-4 shrink-0 text-[#4F46E5] mt-0.5" />}

            <div className="flex-1 leading-snug">{toast.message}</div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-0.5 rounded-md hover:bg-black/5 transition-colors shrink-0 text-[#64748B]"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
