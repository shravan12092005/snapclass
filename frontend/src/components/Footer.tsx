"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Shield, ArrowUpRight } from "lucide-react";

function GithubIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  if (!isHomePage) {
    // Compact footer for app dashboard and auth pages
    return (
      <footer className="border-t border-[#E2E8F0] bg-white py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#4F46E5]" />
            <span className="font-semibold text-[#0F172A]">SnapClass</span>
            <span>&bull;</span>
            <span>&copy; 2026 SnapClass. Built by Shravan Mole</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[#047857]">
              <Shield className="h-3.5 w-3.5" />
              <span className="font-medium">
                Biometric data stored as numeric embeddings, never as photos.
              </span>
            </div>
            <span>&bull;</span>
            <span>Consent-based enrolment</span>
          </div>
        </div>
      </footer>
    );
  }

  // Full comprehensive marketing footer for landing page
  return (
    <footer className="border-t border-[#E2E8F0] bg-white pt-14 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#E2E8F0]">
          {/* Brand info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-[#0F172A]">
                Snap<span className="text-[#4F46E5]">Class</span>
              </span>
            </Link>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Fast, privacy-first classroom attendance powered by neural facial recognition and acoustic voice embeddings.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#047857] font-medium pt-1">
              <Shield className="h-4 w-4 text-[#047857] shrink-0" />
              <span>Biometric data stored as numeric embeddings, never as photos.</span>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Product</h4>
            <ul className="space-y-2 text-xs text-[#64748B]">
              <li>
                <a href="#features" className="hover:text-[#4F46E5] transition-colors">
                  AI Face Analysis
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#4F46E5] transition-colors">
                  Sequential Voice ID
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#4F46E5] transition-colors">
                  QR-Driven Roster
                </a>
              </li>
              <li>
                <a href="#tech" className="hover:text-[#4F46E5] transition-colors">
                  Tech Stack & Architecture
                </a>
              </li>
            </ul>
          </div>

          {/* Experience Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Experience</h4>
            <ul className="space-y-2 text-xs text-[#64748B]">
              <li>
                <a href="#teachers" className="hover:text-[#4F46E5] transition-colors">
                  Teacher Journey
                </a>
              </li>
              <li>
                <a href="#students" className="hover:text-[#4F46E5] transition-colors">
                  Student Journey
                </a>
              </li>
              <li>
                <Link href="/teacher/login" className="hover:text-[#4F46E5] transition-colors">
                  Teacher Portal
                </Link>
              </li>
              <li>
                <Link href="/student/login" className="hover:text-[#4F46E5] transition-colors">
                  Student Face Sign-In
                </Link>
              </li>
              <li>
                <Link href="/student/register" className="hover:text-[#4F46E5] transition-colors">
                  Biometric Registration
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Company & Source</h4>
            <ul className="space-y-2 text-xs text-[#64748B]">
              <li>
                <span className="text-[#0F172A] font-semibold">Built by Shravan Mole</span>
              </li>
              <li>
                <a
                  href="https://github.com/shravan12092005/snapclass"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-[#4F46E5] transition-colors"
                >
                  <GithubIcon className="h-3.5 w-3.5" />
                  <span>GitHub Repository</span>
                  <ArrowUpRight className="h-3 w-3 text-[#94A3B8]" />
                </a>
              </li>
              <li>
                <a href="#privacy" className="hover:text-[#4F46E5] transition-colors">
                  Privacy Guardrails
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#4F46E5] transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <p>&copy; 2026 SnapClass. Built by Shravan Mole</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Next.js 16</span>
            <span>&bull;</span>
            <span>FastAPI</span>
            <span>&bull;</span>
            <span>Supabase PostgreSQL</span>
            <span>&bull;</span>
            <span>dlib & Resemblyzer</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
