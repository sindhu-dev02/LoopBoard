import { z } from "zod";

export const updateNotificationPreferencesSchema = z.object({
  taskAssigned: z.boolean().optional(),
  taskOverdue: z.boolean().optional(),
  comments: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
});