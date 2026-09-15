import { api } from "@/lib/api";
import { User } from "@/types";

export async function updateProfile(
  id: string,
  patch: { name?: string; role?: string; email?: string }
): Promise<Omit<User, "password">> {
  return api.patch<Omit<User, "password">>(`/api/users/${id}`, patch);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.patch<void>("/api/auth/password", { currentPassword, newPassword });
}
