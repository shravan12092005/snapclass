"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { CurrentUser, Teacher, Student, UserRole } from "@/types";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  currentUser: CurrentUser;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  isTeacher: boolean;
  isStudent: boolean;
  user: Teacher | Student | null;
  role: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    authenticated: false,
    role: null,
    user: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshAuth = useCallback(async () => {
    try {
      const data = await api.getMe();
      setCurrentUser(data);
    } catch {
      setCurrentUser({ authenticated: false, role: null, user: null });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setCurrentUser({ authenticated: false, role: null, user: null });
      router.push("/");
    }
  };

  const isTeacher = currentUser.authenticated && currentUser.role === "teacher";
  const isStudent = currentUser.authenticated && currentUser.role === "student";

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        refreshAuth,
        logout,
        isTeacher,
        isStudent,
        user: currentUser.user,
        role: currentUser.role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
