"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import CameraCapture from "@/components/CameraCapture";
import { UserCheck, AlertCircle, ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StudentFaceLoginPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutRemaining === null || lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setError(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const handleFaceCapture = async (imageBlob: Blob) => {
    if (lockoutRemaining && lockoutRemaining > 0) {
      setError(`Authentication is locked. Please wait ${lockoutRemaining} seconds.`);
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      await api.loginStudentFace(imageBlob);
      await refreshAuth();
      router.push("/student");
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          // Extract remaining seconds from message if available
          const match = err.message.match(/(\d+)\s+seconds/);
          const seconds = match ? parseInt(match[1], 10) : 60;
          setLockoutRemaining(seconds);
          setError(`Too many failed attempts. Device is locked out for ${seconds} seconds.`);
        } else {
          setError(err.message);
        }
      } else {
        setError("Network error while connecting to biometric authentication service.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-6 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] items-center justify-center text-[#047857] mb-3">
            <UserCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Student Face Login</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Authenticate instantly with your enrolled facial biometric profile
          </p>
        </div>

        {/* Lockout Banner */}
        {lockoutRemaining && lockoutRemaining > 0 ? (
          <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-3 text-xs text-[#B91C1C]">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-bold text-sm">Security Lockout Active</p>
              <p className="mt-1">
                Too many unrecognized face attempts. You must wait{" "}
                <span className="font-mono font-bold text-base px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                  {lockoutRemaining}s
                </span>{" "}
                before attempting another scan.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="mb-6 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        ) : null}

        {/* Camera Component */}
        <div className="relative">
          <CameraCapture
            onCapture={handleFaceCapture}
            title=""
            subtitle=""
          />

          {isVerifying && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center z-20">
              <Loader2 className="h-8 w-8 text-[#4F46E5] animate-spin mb-2" />
              <p className="text-sm font-bold text-[#0F172A]">Analyzing Facial Landmarks…</p>
              <p className="text-xs text-[#64748B] mt-1">Comparing 128D biometric vector</p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-[#0F172A] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Portal Home</span>
          </Link>
          <div>
            <span>Not registered yet? </span>
            <Link href="/student/register" className="font-semibold text-[#4F46E5] hover:underline">
              Create Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
