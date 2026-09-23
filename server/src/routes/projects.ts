import { Router } from "express";
import { getAllProjects, getProjectById, createProject, updateProject, deleteProject, logActivity, allTeamMembersOwnedBy } from "../data/store";
import { createProjectSchema, updateProjectSchema } from "../schemas/project";
import { asyncHandler } from "../middleware/asyncHandler";
import { NotFoundError, ValidationError } from "../errors/AppError";

const router = Router();
router.get("/", asyncHandler(async (req, res) => {
    res.json(await getAllProjects(req.userId!));
}));

router.get("/:id", asyncHandler(async (req, res) => {
    const project = await getProjectById(String(req.params.id), req.userId!);

    if (!project) {
        throw new NotFoundError("Project not found");
    }

    res.json(project);
}));

router.post("/", asyncHandler(async (req, res) => {
    const result = createProjectSchema.safeParse(req.body);

    if (!result.success) {
        throw new ValidationError(
            "Invalid project data",
            result.error.issues
        );
    }

    // Reject up front if any memberId belongs to someone else's team (or
    // doesn't exist at all) — without this, a user could attach another
    // user's team member to their own project just by knowing/guessing its id.
    if (result.data.memberIds?.length) {
        const owned = await allTeamMembersOwnedBy(result.data.memberIds, req.userId!);
        if (!owned) {
            throw new ValidationError("One or more team members were not found");
        }
    }

    const newProject = await createProject(result.data, req.userId!);

    await logActivity({
        actor: req.userName!,
        action: "created",
        target: newProject!.name,
        ownerId: req.userId!,
    });

    res.status(201).json(newProject);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
    const result = updateProjectSchema.safeParse(req.body);

    if (!result.success) {
        throw new ValidationError(
            "Invalid project data",
            result.error.issues
        );
    }

    if (result.data.memberIds?.length) {
        const owned = await allTeamMembersOwnedBy(result.data.memberIds, req.userId!);
        if (!owned) {
            throw new ValidationError("One or more team members were not found");
        }
    }

    const project = await updateProject(
        String(req.params.id),
        result.data,
        req.userId!
    );

    if (!project) {
        throw new NotFoundError("Project not found");
    }

    res.json(project);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
    const deleted = await deleteProject(String(req.params.id), req.userId!);

    if (!deleted) {
        throw new NotFoundError("Project not found");
    }

    res.status(204).send();
}));

export default router;