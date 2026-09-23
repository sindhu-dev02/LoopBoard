import { Router } from "express";
import { getRecentActivity } from "../data/store";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getRecentActivity(req.userId!));
  })
);

export default router;