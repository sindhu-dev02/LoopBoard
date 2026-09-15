import { api } from "@/lib/api";

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post<{ message: string }>("/api/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post<void>("/api/auth/reset-password", { token, newPassword });
}