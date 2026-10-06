"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { GraduationCap, Lock, User, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function TeacherAuthPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePasswordRules = (pwd: string, confirm: string): string | null => {
    if (pwd !== confirm) {
      return "Passwords do not match.";
    }
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (!/\d/.test(pwd)) {
      return "Password must contain at least one digit.";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one uppercase letter.";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least one lowercase letter.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === "login") {
      if (!username.trim() || !password) {
        setError("Please enter both username and password.");
        return;
      }

      setIsSubmitting(true);
      try {
        await api.loginTeacher(username.trim(), password);
        await refreshAuth();
        router.push("/teacher");
      } catch (err: any) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to log in. Please check your network and credentials.");
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Register mode
      if (!username.trim() || !name.trim() || !password) {
        setError("All fields are required.");
        return;
      }

      const pwError = validatePasswordRules(password, passwordConfirm);
      if (pwError) {
        setError(pwError);
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await api.registerTeacher(username.trim(), name.trim(), password, passwordConfirm);
        setSuccessMessage(res.message || "Account created successfully! Please sign in.");
        setMode("login");
        setPassword("");
        setPasswordConfirm("");
      } catch (err: any) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to create account. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8">
        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] items-center justify-center text-[#4F46E5] mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {mode === "login" ? "Teacher Sign In" : "Create Teacher Account"}
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {mode === "login"
              ? "Access your classroom subjects and attendance records"
              : "Register as an instructor to start managing course attendance"}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "login"
                ? "bg-white text-[#0F172A] shadow-xs"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "register"
                ? "bg-white text-[#0F172A] shadow-xs"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Register
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-start gap-2.5 text-xs text-[#047857]">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="prof_smith"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#64748B] focus:border-[#4F46E5] focus:outline-hidden transition-colors"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jane Smith"
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#64748B] focus:border-[#4F46E5] focus:outline-hidden transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#64748B] focus:border-[#4F46E5] focus:outline-hidden transition-colors"
              />
            </div>
            {mode === "register" && (
              <p className="text-[11px] text-[#64748B] mt-1">
                Min 8 characters, with 1 digit, 1 uppercase, and 1 lowercase letter.
              </p>
            )}
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#64748B] focus:border-[#4F46E5] focus:outline-hidden transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-xs disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
          </button>
        </form>

        {/* Back Link */}
        <div className="mt-6 text-center text-xs text-[#64748B]">
          <Link href="/" className="hover:text-[#0F172A] transition-colors">
            &larr; Back to Portal Selection
          </Link>
        </div>
      </div>
    </div>
  );
}
