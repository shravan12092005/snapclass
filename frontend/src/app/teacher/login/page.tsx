"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import {
  GraduationCap,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function TeacherAuthPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

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

  // Password strength indicator for register mode
  const getPasswordStrength = () => {
    if (!password || mode !== "register") return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (/\d/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (password.length >= 12) score++;

    if (score <= 2) return { label: "Weak", color: "bg-red-400", width: "33%" };
    if (score <= 3) return { label: "Fair", color: "bg-amber-400", width: "66%" };
    return { label: "Strong", color: "bg-emerald-500", width: "100%" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-[#EEF2FF] to-transparent rounded-full opacity-50" />

          {/* Header Icon */}
          <div className="text-center mb-6 relative">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] border border-[#C7D2FE] items-center justify-center text-[#4F46E5] mb-3 shadow-sm">
              <GraduationCap className="h-7 w-7" />
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
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                mode === "login"
                  ? "bg-white text-[#0F172A] shadow-sm"
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
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                mode === "register"
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Register
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#B91C1C] animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-start gap-2.5 text-xs text-[#047857] animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="prof_smith"
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#94A3B8] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#94A3B8] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 focus:outline-hidden transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[#94A3B8] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 focus:outline-hidden transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {mode === "register" && password && strength && (
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p className="text-[10px] text-[#64748B]">
                    Strength: <span className="font-semibold">{strength.label}</span>
                    {" · "}Min 8 characters, 1 digit, 1 uppercase, 1 lowercase
                  </p>
                </div>
              )}
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPasswordConfirm ? "text" : "password"}
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border bg-white text-[#0F172A] placeholder-[#94A3B8] focus:ring-2 focus:ring-[#4F46E5]/10 focus:outline-hidden transition-all ${
                      passwordConfirm && password !== passwordConfirm
                        ? "border-red-300 focus:border-red-400"
                        : "border-[#E2E8F0] focus:border-[#4F46E5]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#64748B] transition-colors"
                    aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
                  >
                    {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">Passwords do not match</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
            </button>
          </form>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Portal Selection</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
