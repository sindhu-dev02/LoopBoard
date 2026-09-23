import { Router } from "express";
import { getProjectById, getTasksByProject } from "../data/store";
import { generateTasksSchema, summarizeProjectSchema } from "../schemas/ai";
import { asyncHandler } from "../middleware/asyncHandler";
import { NotFoundError, ValidationError } from "../errors/AppError";
import { genAI } from "../lib/gemini";
import { TaskPriority } from "@shared/types";

interface SuggestedTask {
  title: string;
  priority: TaskPriority;
  dueInDays: number;
}

function isSuggestedTask(value: unknown): value is SuggestedTask {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    (v.priority === "low" || v.priority === "medium" || v.priority === "high") &&
    typeof v.dueInDays === "number"
  );
}

function toDateOnly(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

const router = Router();

router.post(
  "/projects/summarize",
  asyncHandler(async (req, res) => {
    const result = summarizeProjectSchema.safeParse(req.body);
    if (!result.success)
      throw new ValidationError("Invalid request", result.error.issues);

    const project = await getProjectById(result.data.projectId, req.userId!);
    if (!project) throw new NotFoundError("Project not found");

    const tasks = await getTasksByProject(project.id, req.userId!);

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const taskLines = tasks.length
      ? tasks
          .map(
            (t) =>
              `- "${t.title}" — status: ${t.status}, priority: ${t.priority}, due: ${t.dueDate}` +
              (t.assignee ? `, assignee: ${t.assignee}` : "")
          )
          .join("\n")
      : "No tasks have been created for this project yet.";

    const prompt =
      "You are a project status assistant writing a short digest for a busy team lead. " +
      "Given a project's details and its current tasks, write a concise status summary in 3-5 sentences. " +
      "Cover: overall progress, anything overdue or at risk, and what should happen next. " +
      "Plain prose only, no markdown or bullet points.\n\n" +
      `Project: ${project.name}\n` +
      `Description: ${project.description}\n` +
      `Status: ${project.status}\n` +
      `Progress: ${project.completedTaskCount}/${project.taskCount} tasks complete (${project.progress}%)\n` +
      `Due date: ${project.dueDate}\n\n` +
      `Tasks:\n${taskLines}`;

    const response = await model.generateContent(prompt);
    const summary = response.response.text().trim();

    res.json({ summary });
  })
);

export default router;