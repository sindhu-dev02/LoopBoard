import { Router } from "express";
import { getAllTeamMembers, getTeamMemberById, createTeamMember, updateTeamMember, deleteTeamMember } from "../data/store";
import { createTeamMemberSchema, updateTeamMemberSchema } from "../schemas/teamMember";
import { asyncHandler } from "../middleware/asyncHandler";
import { NotFoundError, ValidationError } from "../errors/AppError";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
    res.json(await getAllTeamMembers(req.userId!));
}));

router.get("/:id", asyncHandler(async (req, res) => {
    const member = await getTeamMemberById(String(req.params.id), req.userId!);

    if (!member) {
        throw new NotFoundError("Team member not found");
    }

    res.json(member);
}));

router.post("/", asyncHandler(async (req, res) => {
    const result = createTeamMemberSchema.safeParse(req.body);

    if (!result.success) {
        throw new ValidationError(
            "Invalid team member data",
            result.error.issues
        );
    }

    const newMember = await createTeamMember(result.data, req.userId!);

    res.status(201).json(newMember);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
    const result = updateTeamMemberSchema.safeParse(req.body);

    if (!result.success) {
        throw new ValidationError(
            "Invalid team member data",
            result.error.issues
        );
    }

    const member = await updateTeamMember(
        String(req.params.id),
        result.data,
        req.userId!
    );

    if (!member) {
        throw new NotFoundError("Team member not found");
    }

    res.json(member);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
    const deleted = await deleteTeamMember(String(req.params.id), req.userId!);

    if (!deleted) {
        throw new NotFoundError("Team member not found");
    }

    res.status(204).send();
}));

export default router;