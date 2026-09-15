import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import tasksRouter from "./routes/tasks";
import projectsRouter from "./routes/projects";
import teamRouter from "./routes/team";
import usersRouter from "./routes/users";
import authRouter from "./routes/auth";
import activityRouter from "./routes/activity";
import dashboardRouter from "./routes/dashboard";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/requireAuth";
import { prisma } from "./lib/prisma";
import aiRouter from "./routes/ai";
import notificationsRouter from "./routes/notifications";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use("/api/tasks", requireAuth, tasksRouter);
app.use("/api/projects", requireAuth, projectsRouter);
app.use("/api/team", requireAuth, teamRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/activity", requireAuth, activityRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/ai", requireAuth, aiRouter);
app.use("/api/notifications", requireAuth, notificationsRouter);
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);