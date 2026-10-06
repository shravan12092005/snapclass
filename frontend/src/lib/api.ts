import {
  CurrentUser,
  Teacher,
  Student,
  Subject,
  RosterEntry,
  ShareInfo,
  FaceAttendanceResponse,
  VoiceAttendanceResponse,
  AttendanceLogEntry,
  AttendanceSessionSummary,
  StudentDashboardResponse,
} from "@/types";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include", // Ensures httpOnly session cookies are transmitted
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    let data = null;
    try {
      data = await res.json();
      if (data && data.detail) {
        errorDetail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // not JSON
    }
    throw new ApiError(errorDetail || `Request failed with status ${res.status}`, res.status, data);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // -------------------------------------------------------------------------
  // Session & Auth
  // -------------------------------------------------------------------------
  async getMe(): Promise<CurrentUser> {
    try {
      return await fetchJson<CurrentUser>("/api/auth/me");
    } catch {
      return { authenticated: false, role: null, user: null };
    }
  },

  async loginTeacher(username: string, password: string): Promise<{ message: string; user: Teacher }> {
    return fetchJson<{ message: string; user: Teacher }>("/api/auth/teacher/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  },

  async registerTeacher(
    username: string,
    name: string,
    password: string,
    passwordConfirm: string
  ): Promise<{ message: string }> {
    return fetchJson<{ message: string }>("/api/auth/teacher/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        name,
        password,
        password_confirm: passwordConfirm,
      }),
    });
  },

  async loginStudentFace(imageBlob: Blob): Promise<{ message: string; user: Student }> {
    const formData = new FormData();
    formData.append("image", imageBlob, "face_login.jpg");

    return fetchJson<{ message: string; user: Student }>("/api/auth/student/face-login", {
      method: "POST",
      body: formData,
    });
  },

  async registerStudent(
    name: string,
    consent: boolean,
    imageBlob: Blob,
    audioBlob?: Blob | null
  ): Promise<{ message: string; user: Student }> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("consent", consent ? "true" : "false");
    formData.append("image", imageBlob, "face_profile.jpg");
    if (audioBlob) {
      formData.append("audio", audioBlob, "voice_sample.webm");
    }

    return fetchJson<{ message: string; user: Student }>("/api/auth/student/register", {
      method: "POST",
      body: formData,
    });
  },

  async logout(): Promise<{ message: string }> {
    return fetchJson<{ message: string }>("/api/auth/logout", {
      method: "POST",
    });
  },

  // -------------------------------------------------------------------------
  // Subjects (Teacher)
  // -------------------------------------------------------------------------
  async getSubjects(): Promise<Subject[]> {
    const res = await fetchJson<{ subjects: Subject[] }>("/api/subjects/");
    return res.subjects || [];
  },

  async createSubject(name: string, section: string): Promise<Subject> {
    return fetchJson<Subject>("/api/subjects/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, section }),
    });
  },

  async deleteSubject(subjectId: number): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`/api/subjects/${subjectId}`, {
      method: "DELETE",
    });
  },

  async getShareInfo(subjectId: number): Promise<ShareInfo> {
    return fetchJson<ShareInfo>(`/api/subjects/${subjectId}/share`);
  },

  async getRoster(subjectId: number): Promise<RosterEntry[]> {
    const res = await fetchJson<{ roster: RosterEntry[] }>(`/api/subjects/${subjectId}/roster`);
    return res.roster || [];
  },

  async removeRosterStudent(subjectId: number, studentId: number): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`/api/subjects/${subjectId}/students/${studentId}`, {
      method: "DELETE",
    });
  },

  // -------------------------------------------------------------------------
  // Attendance (Teacher)
  // -------------------------------------------------------------------------
  async scanFaceAttendance(subjectId: number, images: (Blob | File)[]): Promise<FaceAttendanceResponse> {
    const formData = new FormData();
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const filename = (file as File).name || `classroom_${i + 1}.jpg`;
      formData.append("images", file, filename);
    }

    return fetchJson<FaceAttendanceResponse>(`/api/attendance/face?subject_id=${subjectId}`, {
      method: "POST",
      body: formData,
    });
  },

  async scanVoiceAttendance(subjectId: number, audio: Blob | File): Promise<VoiceAttendanceResponse> {
    const formData = new FormData();
    const filename = (audio as File).name || "classroom_audio.webm";
    formData.append("audio", audio, filename);

    return fetchJson<VoiceAttendanceResponse>(`/api/attendance/voice?subject_id=${subjectId}`, {
      method: "POST",
      body: formData,
    });
  },

  async saveAttendance(logs: AttendanceLogEntry[]): Promise<{ message: string }> {
    return fetchJson<{ message: string }>("/api/attendance/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs }),
    });
  },

  async getAttendanceRecords(): Promise<AttendanceSessionSummary[]> {
    const res = await fetchJson<{ sessions: AttendanceSessionSummary[] }>("/api/attendance/records");
    return res.sessions || [];
  },

  // -------------------------------------------------------------------------
  // Student Dashboard & Enrollment
  // -------------------------------------------------------------------------
  async getStudentDashboard(): Promise<StudentDashboardResponse> {
    return fetchJson<StudentDashboardResponse>("/api/student/dashboard");
  },

  async enrollInSubject(subjectCode: string): Promise<{ message: string }> {
    return fetchJson<{ message: string }>("/api/enrollment/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject_code: subjectCode }),
    });
  },

  async unenrollFromSubject(subjectId: number): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`/api/enrollment/${subjectId}`, {
      method: "DELETE",
    });
  },

  async deleteStudentProfile(): Promise<{ message: string }> {
    return fetchJson<{ message: string }>("/api/student/profile", {
      method: "DELETE",
    });
  },
};
