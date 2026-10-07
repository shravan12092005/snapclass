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

export interface UploadOptions {
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

function uploadWithProgress<T>(
  url: string,
  formData: FormData,
  options: UploadOptions = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");

    if (options.signal) {
      if (options.signal.aborted) {
        return reject(new DOMException("Aborted", "AbortError"));
      }
      options.signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new DOMException("Aborted", "AbortError"));
      });
    }

    if (xhr.upload && options.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Not JSON
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
      } else {
        let errorDetail = xhr.statusText;
        if (data && data.detail) {
          errorDetail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
        }
        reject(
          new ApiError(
            errorDetail || `Request failed with status ${xhr.status}`,
            xhr.status,
            data
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(new ApiError("Network error. Please check your connection.", 0));
    };

    xhr.onabort = () => {
      reject(new DOMException("Aborted", "AbortError"));
    };

    xhr.ontimeout = () => {
      reject(new ApiError("Request timed out.", 408));
    };

    xhr.send(formData);
  });
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

  async loginStudentFace(
    imageBlob: Blob,
    options?: UploadOptions
  ): Promise<{ message: string; user: Student }> {
    const formData = new FormData();
    formData.append("image", imageBlob, "face_login.jpg");

    return uploadWithProgress<{ message: string; user: Student }>(
      "/api/auth/student/face-login",
      formData,
      options
    );
  },

  async registerStudent(
    name: string,
    consent: boolean,
    imageBlob: Blob,
    audioBlob?: Blob | null,
    options?: UploadOptions
  ): Promise<{ message: string; user: Student }> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("consent", consent ? "true" : "false");
    formData.append("image", imageBlob, "face_profile.jpg");
    if (audioBlob) {
      formData.append("audio", audioBlob, "voice_sample.webm");
    }

    return uploadWithProgress<{ message: string; user: Student }>(
      "/api/auth/student/register",
      formData,
      options
    );
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
  async scanFaceAttendance(
    subjectId: number,
    images: (Blob | File)[],
    options?: UploadOptions
  ): Promise<FaceAttendanceResponse> {
    const formData = new FormData();
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const filename = (file as File).name || `classroom_${i + 1}.jpg`;
      formData.append("images", file, filename);
    }

    return uploadWithProgress<FaceAttendanceResponse>(
      `/api/attendance/face?subject_id=${subjectId}`,
      formData,
      options
    );
  },

  async scanVoiceAttendance(
    subjectId: number,
    audio: Blob | File,
    options?: UploadOptions
  ): Promise<VoiceAttendanceResponse> {
    const formData = new FormData();
    const filename = (audio as File).name || "classroom_audio.webm";
    formData.append("audio", audio, filename);

    return uploadWithProgress<VoiceAttendanceResponse>(
      `/api/attendance/voice?subject_id=${subjectId}`,
      formData,
      options
    );
  },

  async saveAttendance(
    logs: AttendanceLogEntry[],
    options?: { signal?: AbortSignal }
  ): Promise<{ message: string }> {
    return fetchJson<{ message: string }>("/api/attendance/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs }),
      signal: options?.signal,
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
