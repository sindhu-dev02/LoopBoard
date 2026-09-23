import { Router } from "express";
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  logActivity,
  taskTitleExistsInProject,
  getProjectById,
  getTeamMemberById,
} from "../data/store";
import { createTaskSchema, updateTaskSchema } from "../schemas/task";
import { asyncHandler } from "../middleware/asyncHandler";
import { NotFoundError, ValidationError } from "../errors/AppError";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
    res.json(await getAllTasks(req.userId!));
}));

router.get("/:id", asyncHandler(async (req, res) => {
    const task = await getTaskById(String(req.params.id), req.userId!);
    if (!task) throw new NotFoundError("Task not found");
    res.json(task);
}));

router.post("/", asyncHandler(async (req, res) => {
    const result = createTaskSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError("Invalid task data", result.error.issues);

    // Both checks double as ownership checks: getProjectById/getTeamMemberById
    // are owner-scoped, so a projectId/assigneeId belonging to someone else
    // comes back "not found" here, same as if it never existed.
    const project = await getProjectById(result.data.projectId, req.userId!);
    if (!project) throw new NotFoundError("Project not found");

    if (result.data.assigneeId) {
        const assignee = await getTeamMemberById(result.data.assigneeId, req.userId!);
        if (!assignee) throw new NotFoundError("Team member not found");
    }

    const isDuplicate = await taskTitleExistsInProject(result.data.projectId, result.data.title, req.userId!);
    if (isDuplicate) {
        throw new ValidationError(`A task named "${result.data.title}" already exists in this project`);
    }

    const newTask = await createTask(result.data);

    await logActivity({
        actor: req.userName!,
        action: "created",
        target: newTask!.title,
        ownerId: req.userId!,
    });

    res.status(201).json(newTask);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
    const result = updateTaskSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError("Invalid task data", result.error.issues);

    if (result.data.projectId) {
        const project = await getProjectById(result.data.projectId, req.userId!);
        if (!project) throw new NotFoundError("Project not found");
    }
    if (result.data.assigneeId) {
        const assignee = await getTeamMemberById(result.data.assigneeId, req.userId!);
        if (!assignee) throw new NotFoundError("Team member not found");
    }

    const task = await updateTask(String(req.params.id), result.data, req.userId!);
    if (!task) throw new NotFoundError("Task not found");

    if (result.data.status) {
        await logActivity({
            actor: req.userName!,
            action: task.status === "done" ? "completed" : "status-changed",
            target: task.title,
            detail: task.status !== "done" ? `Moved to ${task.status}` : undefined,
            ownerId: req.userId!,
        });
    }

    res.json(task);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
    const success = await deleteTask(String(req.params.id), req.userId!);
    if (!success) throw new NotFoundError("Task not found");
    res.status(204).send();
}));

export default router;