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
  name: string;
  subject_code: string;
  teacher_id: number;
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
