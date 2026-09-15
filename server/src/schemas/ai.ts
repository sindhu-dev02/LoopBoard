import { z } from "zod";

export const generateTasksSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  count: z.number().int().min(1).max(10).optional(),
});

export const summarizeProjectSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
});