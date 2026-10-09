"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { AttendanceSessionSummary } from "@/types";
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  Search,
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { getAttendanceRateInfo } from "@/lib/rateColor";
import { TableSkeleton } from "@/components/Skeleton";

export default function AttendanceRecordsTab() {
  const [sessions, setSessions] = useState<AttendanceSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Filter states
  const [datePreset, setDatePreset] = useState<"today" | "7d" | "30d" | "all" | "custom">("30d");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hoveredPoint, setHoveredPoint] = useState<AttendanceSessionSummary | null>(null);

  // Fetch records
  const fetchRecords = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await api.getAttendanceRecords();
      setSessions(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load attendance records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Compute available subject list
  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      if (s.Subject) set.add(s.Subject);
    }
    return Array.from(set).sort();
  }, [sessions]);

  // Handle Preset Changes
  const handlePresetChange = (preset: "today" | "7d" | "30d" | "all" | "custom") => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (preset === "today") {
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
    } else if (preset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setCustomStartDate(d.toISOString().split("T")[0]);
      setCustomEndDate(todayStr);
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setCustomStartDate(d.toISOString().split("T")[0]);
      setCustomEndDate(todayStr);
    } else if (preset === "all") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Subject filter
      if (selectedSubject !== "all" && s.Subject !== selectedSubject) {
        return false;
      }

      // Date filtering
      if (datePreset !== "all" && (customStartDate || customEndDate)) {
        let itemDate = "";
        if (s.ts_group) {
          itemDate = s.ts_group.split("T")[0];
        } else if (s.Time) {
          itemDate = s.Time.split(" ")[0];
        }

        if (itemDate) {
          if (customStartDate && itemDate < customStartDate) return false;
          if (customEndDate && itemDate > customEndDate) return false;
        }
      }

      // Table search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = s.Subject.toLowerCase().includes(q);
        const matchesCode = s.Subject_Code.toLowerCase().includes(q);
        const matchesTime = s.Time.toLowerCase().includes(q);
        if (!matchesSubject && !matchesCode && !matchesTime) return false;
      }

      return true;
    });
  }, [sessions, selectedSubject, datePreset, customStartDate, customEndDate, searchQuery]);

  // Derived KPI metrics
  const totalSessionsCount = filteredSessions.length;
  const totalPresentCount = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + (s.present_count ?? 0), 0);
  }, [filteredSessions]);

  const totalPossibleStudents = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + (s.total_count ?? 0), 0);
  }, [filteredSessions]);

  const avgAttendanceRate = useMemo(() => {
    if (totalPossibleStudents === 0) return 0;
    return (totalPresentCount / totalPossibleStudents) * 100;
  }, [totalPossibleStudents, totalPresentCount]);

  const avgRateInfo = useMemo(() => {
    return getAttendanceRateInfo(avgAttendanceRate, totalSessionsCount);
  }, [avgAttendanceRate, totalSessionsCount]);

  // Chart data: sort chronologically
  const chartData = useMemo(() => {
    const list = [...filteredSessions].filter((s) => s.ts_group || s.Time);
    list.sort((a, b) => {
      const tA = a.ts_group || a.Time;
      const tB = b.ts_group || b.Time;
      return tA.localeCompare(tB);
    });
    return list;
  }, [filteredSessions]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredSessions.length === 0) return;

    const headers = ["Time", "Subject", "Subject Code", "Attendance Stats"];
    const rows = filteredSessions.map((s) => [
      `"${(s.Time || "").replace(/"/g, '""')}"`,
      `"${(s.Subject || "").replace(/"/g, '""')}"`,
      `"${(s.Subject_Code || "").replace(/"/g, '""')}"`,
      `"${(s.Attendance_Stats || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "attendance_sessions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">Attendance Analytics & Records</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Inspect roll-call logs, analyze attendance rates over time, and export CSV reports
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchRecords}
            disabled={isLoading}
            className="p-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EEF2FF] text-[#64748B] hover:text-[#4F46E5] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
            title="Refresh records"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredSessions.length === 0}
              className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
            <span className="text-xs text-[#64748B] whitespace-nowrap">
              {filteredSessions.length} {filteredSessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#B91C1C]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
            {(
              [
                ["today", "Today"],
                ["7d", "Last 7 Days"],
                ["30d", "Last 30 Days"],
                ["all", "All Time"],
                ["custom", "Custom"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetChange(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
                  datePreset === key
                    ? "bg-white text-[#4F46E5] shadow-xs border border-[#C7D2FE]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Subject Selector */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <Filter className="h-4 w-4 text-[#64748B] shrink-0" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full lg:w-56 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
            >
              <option value="all">All Subjects</option>
              {uniqueSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Inputs if Custom selected */}
        {datePreset === "custom" && (
          <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#64748B] font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] text-xs focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#64748B] font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] text-xs focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Total Sessions</span>
            <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">{totalSessionsCount}</div>
          <p className="text-[11px] text-[#64748B] mt-1">Recorded classroom roll-calls</p>
        </div>

        {/* Avg Attendance Rate KPI - Uses the exact same colour as the rate badge */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Avg Attendance Rate</span>
            <div className={`p-2 rounded-xl ${avgRateInfo.bgClass} ${avgRateInfo.textClass}`}>
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${avgRateInfo.textClass} mt-2`}>
            {avgRateInfo.label}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Across all selected sessions</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Total Present Logs</span>
            <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {totalPresentCount} <span className="text-xs font-normal text-[#64748B]">/ {totalPossibleStudents}</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Verified student attendances</p>
        </div>
      </div>

      {/* Attendance Trend Chart */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#4F46E5]" />
            <h3 className="text-sm font-bold text-[#0F172A]">Attendance Trend Analysis</h3>
          </div>
          <span className="text-[11px] text-[#64748B]">
            {selectedSubject === "all" ? "All Subjects" : selectedSubject} &bull; Chronological Rate (%)
          </span>
        </div>

        {chartData.length < 4 ? (
          <div className="py-12 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
            Not enough data yet. Trends appear after 4 or more sessions.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative h-56 w-full bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-4 overflow-hidden">
              {(() => {
                const PADDING_Y = 12;
                const usableY = 100 - PADDING_Y * 2;
                const pts = chartData.map((d, i) => {
                  const x = (i / (chartData.length - 1)) * 100;
                  const r = Math.min(100, Math.max(0, d.rate ?? 0));
                  const y = PADDING_Y + (1 - r / 100) * usableY;
                  return { x, y, data: d };
                });

                const lineCmd = pts.reduce(
                  (acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`,
                  ""
                );
                const areaCmd = `${lineCmd} L 100 100 L 0 100 Z`;

                return (
                  <>
                    {/* SVG Trendline & Grid */}
                    <svg
                      className="absolute inset-x-4 inset-y-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] overflow-visible"
                      preserveAspectRatio="none"
                      viewBox="0 0 100 100"
                    >
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line
                        x1="0"
                        y1={PADDING_Y + 0.25 * usableY}
                        x2="100"
                        y2={PADDING_Y + 0.25 * usableY}
                        stroke="#E2E8F0"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1="0"
                        y1={PADDING_Y + 0.5 * usableY}
                        x2="100"
                        y2={PADDING_Y + 0.5 * usableY}
                        stroke="#E2E8F0"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1="0"
                        y1={PADDING_Y + 0.75 * usableY}
                        x2="100"
                        y2={PADDING_Y + 0.75 * usableY}
                        stroke="#E2E8F0"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />

                      {/* Fill Area & Line Path */}
                      <path d={areaCmd} fill="url(#trendGradient)" />
                      <path
                        d={lineCmd}
                        fill="none"
                        stroke="#4F46E5"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>

                    {/* Unstretched Circular HTML Markers */}
                    <div className="absolute inset-x-4 inset-y-4 pointer-events-none">
                      {pts.map((p, idx) => (
                        <div
                          key={idx}
                          style={{ left: `${p.x}%`, top: `${p.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#4F46E5] border-2 border-white shadow-xs pointer-events-auto cursor-pointer hover:scale-125 transition-transform z-10"
                          onMouseEnter={() => setHoveredPoint(p.data)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      ))}
                    </div>
                  </>
                );
              })()}

              {/* Hover Tooltip Overlay */}
              {hoveredPoint && (
                <div className="absolute top-2 right-4 bg-white/95 backdrop-blur-xs border border-[#C7D2FE] shadow-sm rounded-lg p-2.5 text-xs text-[#0F172A] pointer-events-none z-20 animate-in fade-in duration-150">
                  <div className="font-bold">{hoveredPoint.Subject}</div>
                  <div className="text-[10px] text-[#64748B]">{hoveredPoint.Time}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-bold text-[#4F46E5]">{hoveredPoint.rate?.toFixed(1)}%</span>
                    <span className="text-[10px] text-[#64748B]">({hoveredPoint.Attendance_Stats})</span>
                  </div>
                </div>
              )}
            </div>

            {/* X-Axis labels: ensure different or single */}
            {chartData[0]?.Time !== chartData[chartData.length - 1]?.Time ? (
              <div className="flex items-center justify-between text-[10px] text-[#64748B] px-1">
                <span>{chartData[0]?.Time || "Earliest"}</span>
                <span>{chartData[chartData.length - 1]?.Time || "Latest"}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center text-[10px] text-[#64748B] px-1">
                <span>{chartData[0]?.Time}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* All Sessions Log Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden space-y-0">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#4F46E5]" />
            <h3 className="text-sm font-bold text-[#0F172A]">All Sessions Log</h3>
            <span className="text-xs text-[#64748B]">({filteredSessions.length} total)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search sessions…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:border-[#4F46E5] text-[#0F172A]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#64748B]">
            No attendance records found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider text-[10px] bg-[#F8FAFC]/50">
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Course</th>
                  <th className="py-3 px-4 font-semibold">Course Code</th>
                  <th className="py-3 px-4 font-semibold">Attendance Stats</th>
                  <th className="py-3 px-4 font-semibold text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredSessions.map((session, idx) => {
                  const rate = session.rate ?? 0;
                  const total = session.total_count ?? 1;
                  const rateInfo = getAttendanceRateInfo(rate, total);
                  const isExpanded = expandedRows.has(idx);
                  const presentCount = session.present_count ?? 0;
                  const absentCount = Math.max(0, (session.total_count ?? 0) - presentCount);

                  const toggleExpand = () => {
                    setExpandedRows((prev) => {
                      const next = new Set(prev);
                      if (next.has(idx)) next.delete(idx);
                      else next.add(idx);
                      return next;
                    });
                  };

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={toggleExpand}
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer select-none"
                      >
                        <td className="py-3 px-4 font-medium text-[#0F172A] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={`h-4 w-4 text-[#64748B] transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-[#4F46E5]" : ""
                              }`}
                            />
                            <span>{session.Time}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">{session.Subject}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                            {session.Subject_Code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#0F172A]">{session.Attendance_Stats}</td>
                        <td className="py-3 px-4 text-right">
                          <StatusBadge status={rateInfo.status}>{rateInfo.label}</StatusBadge>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-[#F8FAFC]/80 border-b border-[#E2E8F0]">
                          <td colSpan={5} className="py-3.5 px-6">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                                <span className="text-xs font-bold text-[#0F172A]">
                                  Session Roster Breakdown &bull; {session.Subject} ({session.Subject_Code})
                                </span>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status="success">
                                    Present: {presentCount}
                                  </StatusBadge>
                                  <StatusBadge status={absentCount > 0 ? "danger" : "neutral"}>
                                    Absent: {absentCount}
                                  </StatusBadge>
                                </div>
                              </div>

                              {/* Student presence items if returned, or fallback note */}
                              {(session as any).students && Array.isArray((session as any).students) ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {(session as any).students.map((st: any) => (
                                    <div
                                      key={st.student_id || st.name}
                                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E2E8F0] text-xs shadow-2xs"
                                    >
                                      <div>
                                        <span className="font-semibold text-[#0F172A] block">{st.name}</span>
                                        {st.student_id && (
                                          <span className="text-[10px] text-[#64748B]">ID #{st.student_id}</span>
                                        )}
                                      </div>
                                      <StatusBadge status={st.is_present ? "success" : "danger"}>
                                        {st.is_present ? "Present" : "Absent"}
                                      </StatusBadge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[#64748B]">
                                      Total enrolled: <strong className="text-[#0F172A]">{session.total_count ?? 0} students</strong>
                                    </span>
                                    <span className="text-[#E2E8F0]">&bull;</span>
                                    <span className="text-[#047857]">
                                      Verified: <strong>{presentCount} present</strong>
                                    </span>
                                    <span className="text-[#E2E8F0]">&bull;</span>
                                    <span className="text-[#B91C1C]">
                                      Unverified: <strong>{absentCount} absent</strong>
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-[#94A3B8] italic">
                                    (Per-student roster log requires backend records expansion)
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
