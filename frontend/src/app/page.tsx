"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ScanFace,
  Mic,
  QrCode,
  ShieldCheck,
  Lock,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Server,
  Database,
  Cpu,
  Layers,
  CheckCircle2,
  FileCheck2,
  UserMinus,
  Camera,
} from "lucide-react";

// Reusable Browser Frame component for realistic product screenshots
function BrowserFrame({
  src,
  alt,
  urlText = "snapclass.edu/portal",
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  urlText?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#E2E8F0] bg-white shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${className}`}
    >
      {/* Browser chrome header */}
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80" />
        </div>
        <div className="flex-1 max-w-sm mx-auto">
          <div className="bg-white border border-[#E2E8F0] rounded-md px-3 py-0.5 text-[11px] font-mono text-[#64748B] text-center truncate">
            {urlText}
          </div>
        </div>
        <div className="w-10 shrink-0" />
      </div>

      {/* Image container */}
      <div className="relative aspect-[16/10] w-full bg-[#F8FAFC]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
          priority={priority}
          className="object-cover object-top"
          loading={priority ? undefined : "lazy"}
        />
      </div>
    </div>
  );
}

// Fade in observer component for timeline and section entrance
function RevealOnScroll({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  const faqItems = [
    {
      q: "How accurate is AI face recognition in a classroom setting?",
      a: "Detection accuracy depends on classroom lighting and photo clarity. SnapClass runs multi-scale dlib facial alignment and feature extraction. To guarantee complete academic fairness, instructors always review every detected student in the interactive review modal before records are saved.",
    },
    {
      q: "Are original student photos or voice recordings permanently stored?",
      a: "No. Original classroom photos and voice recordings are processed in system memory and immediately discarded. Only irreversible, numeric mathematical embeddings (128-dimensional vectors) are stored in the database.",
    },
    {
      q: "What happens if a student's face is not recognized in the photo?",
      a: "Teachers have complete manual override authority. In the Attendance Review modal, instructors can manually toggle any student present or absent with a single click before confirming and committing the session.",
    },
    {
      q: "Does voice attendance roll-call work in noisy lecture halls?",
      a: "Voice attendance performs best in reasonably quiet rooms. If unexpected ambient background noise interferes with acoustic matching, teachers can review the results and adjust attendance logs before saving.",
    },
  ];

  return (
    <div className="w-full flex flex-col items-center overflow-hidden" id="top">
      {/* =========================================================================
          HERO SECTION
         ========================================================================= */}
      <section className="w-full py-12 md:py-20 lg:py-24 relative">
        {/* Ambient Gradient Blobs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#EEF2FF] to-[#E0E7FF] rounded-full blur-3xl -z-10 opacity-70 pointer-events-none" />
        <div className="absolute top-40 right-10 w-[300px] h-[300px] bg-[#ECFDF5] rounded-full blur-3xl -z-10 opacity-50 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 text-center lg:text-left space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-2xs">
                <span className="flex h-2 w-2 rounded-full bg-[#4F46E5] animate-pulse" />
                <span className="text-xs font-bold text-[#0F172A] tracking-wide">
                  Welcome to SnapClass
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.12]">
                AI-Powered Attendance{" "}
                <br className="hidden sm:inline" />
                in One{" "}
                <span className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#7C3AED] bg-clip-text text-transparent">
                  Snapshot
                </span>
              </h1>

              {/* Subtext */}
              <p className="text-base sm:text-lg text-[#64748B] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Next-generation computer vision and voice biometrics for the classroom. Fast, consent-based, and privacy-first.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/teacher/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
                >
                  <Camera className="h-4 w-4" />
                  <span>Start taking attendance</span>
                </Link>

                <a
                  href="#teachers"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-semibold shadow-2xs transition-colors"
                >
                  <span>See how it works</span>
                  <ArrowRight className="h-4 w-4 text-[#64748B]" />
                </a>
              </div>

              {/* Verification bullets */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#047857]" />
                  <span>Numeric vectors only</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#047857]" />
                  <span>Zero raw photo storage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#047857]" />
                  <span>Faculty verified</span>
                </div>
              </div>
            </div>

            {/* Right Mockup Column */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Floating Browser Frame */}
                <div className="relative transition-transform duration-500 hover:-translate-y-1">
                  <BrowserFrame
                    src="/landing/teacher_dashboard.webp"
                    alt="SnapClass Teacher Dashboard showing active courses and attendance metrics"
                    urlText="snapclass.edu/teacher"
                    priority={true}
                    className="shadow-2xl ring-1 ring-black/5"
                  />
                </div>

                {/* Floating badge bottom-left */}
                <div className="hidden sm:flex absolute -bottom-6 -left-6 bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-xl items-center gap-3 animate-in fade-in zoom-in-90 duration-500">
                  <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">AI Roster Matched</div>
                    <div className="text-[10px] text-[#64748B]">Instant classroom verification</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INNOVATIVE FEATURES SECTION (#features)
         ========================================================================= */}
      <section id="features" className="w-full py-16 md:py-24 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Innovative Features
            </h2>
            <p className="text-sm sm:text-base text-[#64748B]">
              Engineered for academic precision, biometric safety, and instant classroom adoption.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: AI Face Analysis */}
            <RevealOnScroll delay={0}>
              <div className="h-full p-8 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all duration-300 hover:shadow-md flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
                    <ScanFace className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">AI Face Analysis</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    Recognizes every student from a single class photo using multi-scale neural facial alignment and 128-dimensional feature matching.
                  </p>
                </div>
                <div className="pt-2 text-xs font-semibold text-[#4F46E5] flex items-center gap-1">
                  <span>Single snapshot roll call</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </RevealOnScroll>

            {/* Feature 2: Sequential Voice ID */}
            <RevealOnScroll delay={150}>
              <div className="h-full p-8 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all duration-300 hover:shadow-md flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
                    <Mic className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Sequential Voice ID</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    Students say &ldquo;Present&rdquo; one by one and are matched against stored voice embeddings using Resemblyzer and Librosa acoustic modeling.
                  </p>
                </div>
                <div className="pt-2 text-xs font-semibold text-[#4F46E5] flex items-center gap-1">
                  <span>Acoustic verification</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </RevealOnScroll>

            {/* Feature 3: QR-Driven Roster */}
            <RevealOnScroll delay={300}>
              <div className="h-full p-8 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all duration-300 hover:shadow-md flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">QR-Driven Roster</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    Course codes generate shareable QR codes so students enrol in seconds. No spreadsheet imports or tedious registration overhead.
                  </p>
                </div>
                <div className="pt-2 text-xs font-semibold text-[#4F46E5] flex items-center gap-1">
                  <span>Self-service enrolment</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TEACHER JOURNEY TIMELINE (#teachers)
         ========================================================================= */}
      <section id="teachers" className="w-full py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">
              Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              The Teacher&rsquo;s Journey
            </h2>
            <p className="text-sm sm:text-base text-[#64748B]">
              From course creation to automated biometric verification and exported analytics in 7 structured steps.
            </p>
          </div>

          {/* 7-Step Alternating Timeline */}
          <div className="space-y-16 lg:space-y-24">
            {/* Step 1: Secure Login */}
            <RevealOnScroll>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-extrabold tracking-wider uppercase">
                    Step 01
                  </span>
                  <h3 className="text-2xl font-bold text-[#0F172A]">Secure Login</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    Start your session with verified faculty authentication. Signed HTTP cookies ensure protected access to course configurations and attendance rosters.
                  </p>
                </div>
                <div className="lg:col-span-7">
                  <BrowserFrame
                    src="/landing/teacher_login.webp"
                    alt="SnapClass Teacher Login screen with clean authentication interface"
                    urlText="snapclass.edu/teacher/login"
                  />
                </div>
              </div>
            </RevealOnScroll>

            {/* Step 2: Interactive Dashboard */}
            <RevealOnScroll>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-5 lg:order-2 space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-extrabold tracking-wider uppercase">
                    Step 02
                  </span>
                  <h3 className="text-2xl font-bold text-[#0F172A]">Interactive Dashboard</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    View active subjects, enrolled student tallies, total class sessions held, and verified attendance rates from a single compact view.
                  </p>
                </div>
                <div className="lg:col-span-7 lg:order-1">
                  <BrowserFrame
                    src="/landing/teacher_dashboard.webp"
                    alt="SnapClass Interactive Teacher Dashboard with summary KPI cards"
                    urlText="snapclass.edu/teacher"
                  />
                </div>
              </div>
            </RevealOnScroll>

            {/* Step 3: Course Management */}
            <RevealOnScroll>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-extrabold tracking-wider uppercase">
                    Step 03
                  </span>
                  <h3 className="text-2xl font-bold text-[#0F172A]">Course Management</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    Create new courses with faculty-specified custom course codes and section numbers. Delete old subjects or inspect enrolled student lists with one click.
                  </p>
                </div>
                <div className="lg:col-span-7">
                  <BrowserFrame
                    src="/landing/teacher_courses.webp"
                    alt="SnapClass Course Management screen with custom course code input"
                    urlText="snapclass.edu/teacher#courses"
                  />
                </div>
              </div>
            </RevealOnScroll>

            {/* Step 4: Share Class Access */}
            <RevealOnScroll>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-5 lg:order-2 space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-extrabold tracking-wider uppercase">
                    Step 04
                  </span>
                  <h3 className="text-2xl font-bold text-[#0F172A]">Share Class Access</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    Display unique classroom QR codes on the projector or copy the direct 7-character enrollment code so students self-enroll in seconds.
                  </p>
                </div>
                <div className="lg:col-span-7 lg:order-1">
                  <BrowserFrame
                    src="/landing/teacher_share_qr.webp"
                    alt="SnapClass Share Course Modal showing QR code and unique joining link"
                    urlText="snapclass.edu/teacher/share"
                  />
                </div>
              </div>
            </RevealOnScroll>

            {/* Step 5: Face Attendance */}
            <RevealOnScroll>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-extrabold tracking-wider uppercase">
                    Step 05
                  </span>
                  <h3 className="text-2xl font-bold text-[#0F172A]">Face Attendance</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    Capture a classroom photo or upload high-resolution multi-angle pictures. Client-side downscaling ensures rapid upload and multi-face recognition.
                  </p>
                </div>
                <div className="lg:col-span-7">
                  <BrowserFrame
                    src="/landing/teacher_face_attendance.webp"
                    alt="SnapClass Live Face Attendance scanning and detection review"
                    urlText="snapclass.edu/teacher/attendance"
                  />
                </div>
              </div>
            </RevealOnScroll>

            {/* Step 6: Voice Attendance */}
            <RevealOnScroll>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-5 lg:order-2 space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-extrabold tracking-wider uppercase">
                    Step 06
                  </span>
                  <h3 className="text-2xl font-bold text-[#0F172A]">Voice Attendance</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    Switch to acoustic roll-call mode. Students speak sequentially into the microphone, matched against stored voice embeddings.
                  </p>
                </div>
                <div className="lg:col-span-7 lg:order-1">
                  <BrowserFrame
                    src="/landing/teacher_voice_attendance.webp"
                    alt="SnapClass Voice Attendance recording audio waveforms"
                    urlText="snapclass.edu/teacher/voice"
                  />
                </div>
              </div>
            </RevealOnScroll>

            {/* Step 7: Records and Analytics */}
            <RevealOnScroll>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-xs font-extrabold tracking-wider uppercase">
                    Step 07
                  </span>
                  <h3 className="text-2xl font-bold text-[#0F172A]">Records & Analytics</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    Review AI matches with manual override controls before saving. Access historical class logs, download CSV reports, and observe attendance trends over time.
                  </p>
                </div>
                <div className="lg:col-span-7">
                  <BrowserFrame
                    src="/landing/teacher_review_records.webp"
                    alt="SnapClass Attendance Review and Analytics modal with manual toggles"
                    urlText="snapclass.edu/teacher/records"
                  />
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* =========================================================================
          STUDENT JOURNEY SECTION (#students)
         ========================================================================= */}
      <section id="students" className="w-full py-16 md:py-24 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">
              Student Experience
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              The Student&rsquo;s Journey
            </h2>
            <p className="text-sm sm:text-base text-[#64748B]">
              Seamless self-enrollment, transparent biometric consent, and clear personal attendance records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Phase 1: Instant Enrolment */}
            <RevealOnScroll delay={0}>
              <div className="space-y-4">
                <div className="p-1 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <BrowserFrame
                    src="/landing/student_enroll.webp"
                    alt="Student entering 7-character course code to self-enroll"
                    urlText="snapclass.edu/student/enroll"
                  />
                </div>
                <div className="px-2 space-y-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[11px] font-bold uppercase">
                    Phase 01
                  </span>
                  <h3 className="text-lg font-bold text-[#0F172A]">Instant Enrolment</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Students join courses in seconds using teacher-issued course codes or classroom QR scan links.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            {/* Phase 2: Biometric Registration */}
            <RevealOnScroll delay={150}>
              <div className="space-y-4">
                <div className="p-1 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <BrowserFrame
                    src="/landing/student_register.webp"
                    alt="Student facial capture and explicit privacy consent checkbox"
                    urlText="snapclass.edu/student/register"
                  />
                </div>
                <div className="px-2 space-y-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[11px] font-bold uppercase">
                    Phase 02
                  </span>
                  <h3 className="text-lg font-bold text-[#0F172A]">Biometric Registration</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    One-time portrait capture and optional voice profile with mandatory explicit consent prior to numeric vector extraction.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            {/* Phase 3: Personal Dashboard */}
            <RevealOnScroll delay={300}>
              <div className="space-y-4">
                <div className="p-1 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <BrowserFrame
                    src="/landing/student_dashboard.webp"
                    alt="Student dashboard showing verified classes attended and progress"
                    urlText="snapclass.edu/student"
                  />
                </div>
                <div className="px-2 space-y-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[11px] font-bold uppercase">
                    Phase 03
                  </span>
                  <h3 className="text-lg font-bold text-[#0F172A]">Personal Dashboard</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Personalized overview displaying attended classes, per-course percentage progress, and low-attendance warnings.
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* =========================================================================
          HOW IT WORKS STRIP
         ========================================================================= */}
      <section className="w-full py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
              How SnapClass Works
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Three straightforward steps to modern classroom roll calls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] font-extrabold flex items-center justify-center shrink-0">
                1
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0F172A]">Create Course</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Faculty define their course name, section, and custom code. Share the code or QR code with students.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] font-extrabold flex items-center justify-center shrink-0">
                2
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0F172A]">Take Attendance</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Capture a classroom photo or switch to sequential voice mode. The AI pipeline runs detection in memory.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] font-extrabold flex items-center justify-center shrink-0">
                3
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0F172A]">Review Records</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Verify present/absent students, apply manual adjustments if needed, and commit records to Supabase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TECH STACK & ARCHITECTURE (#tech)
         ========================================================================= */}
      <section id="tech" className="w-full py-16 md:py-24 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">
              Engineering Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Advanced Tech Stack
            </h2>
            <p className="text-sm sm:text-base text-[#64748B]">
              Constructed with modern production frameworks, asynchronous Python processing, and state-of-the-art vector models.
            </p>
          </div>

          {/* 4 Real Tech Stack Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
                <Layers className="h-5 w-5" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">Frontend</div>
              <h3 className="text-base font-bold text-[#0F172A]">Next.js 16 & React</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                App Router architecture with TypeScript, Tailwind design tokens, and client-side downscaling.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
                <Server className="h-5 w-5" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">Backend</div>
              <h3 className="text-base font-bold text-[#0F172A]">FastAPI (Python)</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Asynchronous Python backend with signed cookie sessions, device-level lockout, and REST endpoints.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
                <Database className="h-5 w-5" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">Database</div>
              <h3 className="text-base font-bold text-[#0F172A]">Supabase Cloud</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                PostgreSQL cloud database storing encrypted credentials, course rosters, and numeric biometric vectors.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
                <Cpu className="h-5 w-5" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">Vision & Audio AI</div>
              <h3 className="text-base font-bold text-[#0F172A]">dlib & Resemblyzer</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                128D facial vector embedding models paired with Resemblyzer and Librosa acoustic voice features.
              </p>
            </div>
          </div>

          {/* Architecture Flowchart Diagram */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                System Data Flow Diagram
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center text-center">
              {/* Step 1: Client */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-2xs space-y-1">
                <div className="text-xs font-bold text-[#0F172A]">Browser Client</div>
                <div className="text-[11px] text-[#4F46E5] font-semibold">Next.js 16 UI</div>
                <div className="text-[10px] text-[#64748B]">Camera & Audio Capture</div>
              </div>

              {/* Step 2: Gateway */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-2xs space-y-1">
                <div className="text-xs font-bold text-[#0F172A]">Backend Gateway</div>
                <div className="text-[11px] text-[#4F46E5] font-semibold">FastAPI Service</div>
                <div className="text-[10px] text-[#64748B]">Session Auth & Lockout</div>
              </div>

              {/* Step 3: Biometrics Inference */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-2xs space-y-1">
                <div className="text-xs font-bold text-[#0F172A]">Biometric Models</div>
                <div className="text-[11px] text-[#4F46E5] font-semibold">dlib & Resemblyzer</div>
                <div className="text-[10px] text-[#64748B]">Memory Vector Matching</div>
              </div>

              {/* Step 4: Storage */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-2xs space-y-1">
                <div className="text-xs font-bold text-[#0F172A]">Storage Layer</div>
                <div className="text-[11px] text-[#4F46E5] font-semibold">Supabase (PostgreSQL)</div>
                <div className="text-[10px] text-[#64748B]">Vectors, Logs & Rosters</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TRUST AND PRIVACY SECTION (#privacy)
         ========================================================================= */}
      <section id="privacy" className="w-full py-16 md:py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#047857]">
              Privacy & Security
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Privacy First by Design
            </h2>
            <p className="text-sm sm:text-base text-[#64748B]">
              Only what is implemented: strictly verified security controls and ethical biometric handling.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Numeric Embeddings Only</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Biometric data is stored strictly as numeric mathematical vectors, never as raw photo files or recordings.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Explicit Enrolment Consent</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Students must explicitly check and confirm the biometric consent acknowledgment prior to any face extraction.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Device Lockout Defense</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Device cookies and IP rate limits automatically lock authentication after repeated unrecognized face attempts.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
                <UserMinus className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Profile Deletion at Any Time</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Students can permanently delete their biometric profile, numeric embeddings, and historical records directly from their dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ ACCORDION SECTION (#faq)
         ========================================================================= */}
      <section id="faq" className="w-full py-16 md:py-24 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#4F46E5]">
              Common Inquiries
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-[#64748B]">
              Transparent answers regarding recognition mechanics, data policies, and classroom usage.
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-bold text-[#0F172A]">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-[#64748B] shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#4F46E5]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#64748B] leading-relaxed border-t border-[#E2E8F0]/60 bg-white">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          CLOSING CTA SECTION
         ========================================================================= */}
      <section className="w-full py-16 md:py-24 bg-gradient-to-br from-[#4F46E5] to-[#4338CA] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-xs border border-white/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Modernize your classroom</span>
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Ready to upgrade your classroom?
          </h2>

          <p className="text-sm sm:text-base text-indigo-100 max-w-xl mx-auto leading-relaxed">
            Eliminate tedious paper roll calls. Experience verified facial and voice attendance designed for real academic environments.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/teacher/login"
              className="px-6 py-3.5 rounded-xl bg-white text-[#4F46E5] text-sm font-bold shadow-lg hover:bg-slate-50 transition-all hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Start taking attendance
            </Link>

            <Link
              href="/student/login"
              className="px-6 py-3.5 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all backdrop-blur-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Student sign-in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
