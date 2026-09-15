import { api } from "@/lib/api";
import { NotificationPreferences } from "@/types";

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  return api.get<NotificationPreferences>("/api/notifications/preferences");
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return api.patch<NotificationPreferences>("/api/notifications/preferences", patch);
}