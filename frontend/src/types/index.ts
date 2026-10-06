export interface Teacher {
  teacher_id: number;
  username: string;
  name: string;
}

export interface Student {
  student_id: number;
  name: string;
}

export type UserRole = "teacher" | "student";

export interface CurrentUser {
  authenticated: boolean;
  role: UserRole | null;
  user: Teacher | Student | null;
}

export interface Subject {
  subject_id: number;
  subject_code: string;
  name: string;
  section: string;
  teacher_id: number;
  total_students: number;
  total_classes: number;
}

export interface RosterEntry {
  Name: string;
  ID: number;
  Attended: string;
  Rate: string;
}

export interface ShareInfo {
  subject_name: string;
  subject_code: string;
  join_url: string;
}

export interface AttendanceResultEntry {
  Name: string;
  ID: number;
  Source: string;
  Status: string;
}

export interface AttendanceLogEntry {
  student_id: number;
  subject_id: number;
  timestamp: string;
  is_present: boolean;
}

export interface FaceAttendanceResponse {
  results: AttendanceResultEntry[];
  logs: AttendanceLogEntry[];
}

export interface VoiceAttendanceResponse {
  results: AttendanceResultEntry[];
  logs: AttendanceLogEntry[];
  no_profile_count: number;
}

export interface AttendanceSessionSummary {
  Time: string;
  Subject: string;
  Subject_Code: string;
  Attendance_Stats: string;
  ts_group?: string | null;
  present_count?: number;
  total_count?: number;
  rate?: number;
}

export interface StudentDashboardSubject {
  subject_id: number;
  subject_code: string;
  name: string;
  section?: string;
  total: number;
  attended: number;
  rate: number;
}

export interface AttendanceRecord {
  record_id?: number;
  student_id: number;
  subject_id: number;
  timestamp: string;
  is_present: boolean;
  students?: {
    name: string;
    student_id: number;
  };
}

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  reason?: "device" | "ip" | "";
}
