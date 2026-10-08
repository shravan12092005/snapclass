"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <main
      id="main-content"
      className={
        isHome
          ? "flex-1 w-full"
          : "flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      }
    >
      {children}
    </main>
  );
}
