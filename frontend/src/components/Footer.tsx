import React from "react";
import { Shield, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#4F46E5]" />
          <span className="font-semibold text-[#0F172A]">SnapClass</span>
          <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[#047857]">
            <Shield className="h-3.5 w-3.5" />
            <span className="font-medium">Biometric data is stored as numeric embeddings, never as photos.</span>
          </div>
          <span>&bull;</span>
          <span>Consent-based enrolment</span>
        </div>
      </div>
    </footer>
  );
}
