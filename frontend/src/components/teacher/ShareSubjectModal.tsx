"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Subject } from "@/types";
import { X, Copy, Check, MessageCircle, QrCode, ExternalLink } from "lucide-react";

interface ShareSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
}

export default function ShareSubjectModal({ isOpen, onClose, subject }: ShareSubjectModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const joinUrl = typeof window !== "undefined" && subject
    ? `${window.location.origin}/?join-code=${subject.subject_code}`
    : subject
    ? `http://localhost:3000/?join-code=${subject.subject_code}`
    : "";

  useEffect(() => {
    if (joinUrl) {
      QRCode.toDataURL(joinUrl, { width: 240, margin: 1 }, (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      });
    }
  }, [joinUrl]);

  if (!isOpen || !subject) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(subject.subject_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const encodedMessage = encodeURIComponent(
    `Hey! Join our class attendance portal for ${subject.name} on SnapClass here: ${joinUrl}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Share Course Access</h2>
              <p className="text-xs text-[#64748B]">{subject.name} &bull; Section {subject.section}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* QR Code Card */}
          <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-4 flex flex-col items-center justify-center text-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR Code for course joining"
                className="w-44 h-44 rounded-lg bg-white p-2 border border-[#E2E8F0] shadow-2xs"
              />
            ) : (
              <div className="w-44 h-44 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-xs text-[#64748B]">
                Generating QR code…
              </div>
            )}
            <p className="text-xs text-[#64748B] mt-2 font-medium">Students can scan this QR code with their mobile device</p>
          </div>

          {/* Credentials Copy Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                Course Enrollment Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={subject.subject_code}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]"
                />
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-[#047857]" /> : <Copy className="h-3.5 w-3.5 text-[#64748B]" />}
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                Direct Join URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={joinUrl}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-[#047857]" /> : <Copy className="h-3.5 w-3.5 text-[#64748B]" />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Social Share Link */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Share directly via WhatsApp</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        </div>
      </div>
    </div>
  );
}
