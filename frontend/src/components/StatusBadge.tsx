import React from "react";

type StatusType = "success" | "warning" | "danger" | "neutral";

interface StatusBadgeProps {
  status: StatusType;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export default function StatusBadge({ status, children, icon }: StatusBadgeProps) {
  const styles: Record<StatusType, string> = {
    success: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]",
    warning: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
    danger: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
    neutral: "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
