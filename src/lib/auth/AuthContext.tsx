"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User } from "@/types";
import { api, ApiError } from "@/lib/api";

type SafeUser = Omit<User, "password">;

interface AuthContextValue {
  user: SafeUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, role: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<SafeUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SafeUser>("/api/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const loggedInUser = await api.post<SafeUser>("/api/auth/login", { email, password });
      setUser(loggedInUser);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log in");
      throw err;
    }
  }, []);

  const register = useCallback(
    async (name: string, role: string, email: string, password: string) => {
      setError(null);
      try {
        const newUser = await api.post<SafeUser>("/api/auth/register", {
          name,
          role,
          email,
          password,
        });
        setUser(newUser);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to register");
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<SafeUser>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}