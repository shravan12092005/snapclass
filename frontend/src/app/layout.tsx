import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AppShell from "@/components/AppShell";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SnapClass | AI-Powered Attendance in One Snapshot",
    template: "%s | SnapClass",
  },
  description:
    "Next-generation computer vision and voice biometrics for the classroom. Fast, consent-based, and privacy-first.",
  keywords: [
    "attendance",
    "biometric attendance",
    "face recognition",
    "voice attendance",
    "classroom management",
    "FastAPI",
    "Next.js",
  ],
  authors: [{ name: "Shravan Mole" }],
  openGraph: {
    title: "SnapClass | AI-Powered Attendance in One Snapshot",
    description:
      "Next-generation computer vision and voice biometrics for the classroom. Fast, consent-based, and privacy-first.",
    siteName: "SnapClass",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapClass | AI-Powered Attendance System",
    description:
      "Next-generation computer vision and voice biometrics for the classroom.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased scroll-smooth`}>
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-x-hidden">
        {/* Accessible skip to main content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#4F46E5] focus:text-white focus:rounded-xl focus:text-xs focus:font-bold focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <AppShell>{children}</AppShell>
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
