export type RateStatus = "success" | "warning" | "danger" | "neutral";

export interface RateColorInfo {
  status: RateStatus;
  /** Status text color hex adhering strictly to design tokens */
  textColor: "#047857" | "#B45309" | "#B91C1C" | "#64748B";
  textClass: string;
  bgClass: string;
  borderClass: string;
  /** Formatted rate string or 'No classes yet' */
  label: string;
}

/**
 * Shared helper for rate colours across teacher KPIs, session logs, and student cards:
 * - 75% or more: green text/badge (#047857)
 * - 50-74%: amber (#B45309)
 * - below 50%: red (#B91C1C)
 * - total classes = 0: neutral grey "No classes yet" (never a red 0%)
 */
export function getAttendanceRateInfo(
  rate: number | null | undefined,
  totalClasses: number = 1
): RateColorInfo {
  if (totalClasses <= 0) {
    return {
      status: "neutral",
      textColor: "#64748B",
      textClass: "text-[#64748B]",
      bgClass: "bg-[#F8FAFC]",
      borderClass: "border-[#E2E8F0]",
      label: "No classes yet",
    };
  }

  const numericRate = typeof rate === "number" && !isNaN(rate) ? rate : 0;

  if (numericRate >= 75) {
    return {
      status: "success",
      textColor: "#047857",
      textClass: "text-[#047857]",
      bgClass: "bg-[#ECFDF5]",
      borderClass: "border-[#A7F3D0]",
      label: `${numericRate.toFixed(1)}%`,
    };
  }

  if (numericRate >= 50) {
    return {
      status: "warning",
      textColor: "#B45309",
      textClass: "text-[#B45309]",
      bgClass: "bg-[#FFFBEB]",
      borderClass: "border-[#FDE68A]",
      label: `${numericRate.toFixed(1)}%`,
    };
  }

  return {
    status: "danger",
    textColor: "#B91C1C",
    textClass: "text-[#B91C1C]",
    bgClass: "bg-[#FEF2F2]",
    borderClass: "border-[#FECACA]",
    label: `${numericRate.toFixed(1)}%`,
  };
}
