import { Router } from "express";
import { getNotificationPreferences, updateNotificationPreferences } from "../data/store";
import { updateNotificationPreferencesSchema } from "../schemas/notifications";
import { asyncHandler } from "../middleware/asyncHandler";
import { ValidationError } from "../errors/AppError";

const router = Router();

router.get("/preferences", asyncHandler(async (req, res) => {
  res.json(await getNotificationPreferences(req.userId!));
}));

router.patch("/preferences", asyncHandler(async (req, res) => {
  const result = updateNotificationPreferencesSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError("Invalid preferences", result.error.issues);
  res.json(await updateNotificationPreferences(req.userId!, result.data));
}));

export default router;