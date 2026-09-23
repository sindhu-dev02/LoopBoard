import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  Task,
  Project,
  User,
  TeamMember,
  ActivityEvent,
} from "@shared/types";
import { NotFoundError } from "../errors/AppError";
import crypto from "crypto";

// -----------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------

/** date-only fields ("2026-09-15") round-trip cleanly through Postgres `date` columns */
function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function fromDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Prisma throws typed errors for constraint violations. We translate the
 * ones our routes care about into the same AppError subclasses the routes
 * already know how to handle, so a bad `projectId`/`assigneeId` on write
 * comes back as a clean 404 instead of a raw 500.
 */
function translatePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      throw new NotFoundError("Resource not found");
    }
    if (err.code === "P2003") {
      throw new NotFoundError(
        "Referenced project or team member does not exist"
      );
    }
  }
  throw err;
}

// -----------------------------------------------------------------------
// Tasks
//
// Task has no ownerId column of its own — it's scoped transitively through
// its Project's ownerId, so every query below filters/joins through
// `project: { ownerId }` rather than duplicating ownership onto Task too.
// -----------------------------------------------------------------------

type TaskWithAssignee = Prisma.TaskGetPayload<{
  include: { assignee: true };
}>;

function serializeTask(task: TaskWithAssignee): Task {
  return {
    id: task.id,
    title: task.title,
    status: task.status as Task["status"],
    priority: task.priority as Task["priority"],
    projectId: task.projectId,
    assigneeId: task.assigneeId,
    assignee: task.assignee?.name ?? null,
    dueDate: fromDateOnly(task.dueDate),
  };
}

export async function getAllTasks(ownerId: string) {
  const tasks = await prisma.task.findMany({
    where: { project: { ownerId } },
    include: { assignee: true },
    orderBy: { createdAt: "asc" },
  });
  return tasks.map(serializeTask);
}

export async function getTasksByProject(projectId: string, ownerId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId, project: { ownerId } },
    include: { assignee: true },
    orderBy: { createdAt: "asc" },
  });
  return tasks.map(serializeTask);
}

export async function getTaskById(id: string, ownerId: string) {
  const task = await prisma.task.findFirst({
    where: { id, project: { ownerId } },
    include: { assignee: true },
  });
  return task ? serializeTask(task) : null;
}

export async function taskTitleExistsInProject(
  projectId: string,
  title: string,
  ownerId: string
): Promise<boolean> {
  const existing = await prisma.task.findFirst({
    where: {
      projectId,
      project: { ownerId },
      title: { equals: title, mode: "insensitive" },
    },
    select: { id: true },
  });
  return existing !== null;
}

// Note: this does NOT validate that projectId/assigneeId belong to ownerId —
// that's done in the route (via getProjectById/getTeamMemberById, both
// owner-scoped) before this is called, so a 404 with a clear message is
// thrown before we ever get here rather than a generic Prisma FK error.
export async function createTask(data: Omit<Task, "id" | "assignee">) {
  try {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        status: data.status,
        priority: data.priority,
        dueDate: toDateOnly(data.dueDate),
        project: { connect: { id: data.projectId } },
        ...(data.assigneeId
          ? { assignee: { connect: { id: data.assigneeId } } }
          : {}),
      },
      include: { assignee: true },
    });
    return serializeTask(task);
  } catch (err) {
    translatePrismaError(err);
  }
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, "id" | "assignee">>,
  ownerId: string
) {
  const { projectId, assigneeId, dueDate, ...rest } = updates;

  // updateMany + a follow-up read, rather than update(), because `update`
  // has no owner-scoped `where` support beyond a unique key — this way a
  // task that isn't yours returns "not found" instead of touching it.
  const { count } = await prisma.task.updateMany({
    where: { id, project: { ownerId } },
    data: {
      ...rest,
      ...(dueDate ? { dueDate: toDateOnly(dueDate) } : {}),
    },
  });
  if (count === 0) return null;

  // Relation fields (project/assignee reconnect) need a real `update`, not
  // `updateMany` — safe to run now since the ownership check above already
  // passed for this exact id.
  if (projectId || assigneeId !== undefined) {
    try {
      await prisma.task.update({
        where: { id },
        data: {
          ...(projectId ? { project: { connect: { id: projectId } } } : {}),
          ...(assigneeId !== undefined
            ? assigneeId
              ? { assignee: { connect: { id: assigneeId } } }
              : { assignee: { disconnect: true } }
            : {}),
        },
      });
    } catch (err) {
      translatePrismaError(err);
    }
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: { assignee: true },
  });
  return task ? serializeTask(task) : null;
}

export async function deleteTask(id: string, ownerId: string) {
  const { count } = await prisma.task.deleteMany({
    where: { id, project: { ownerId } },
  });
  return count > 0;
}

// -----------------------------------------------------------------------
// Projects
// -----------------------------------------------------------------------

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    memberLinks: { include: { teamMember: true } };
    tasks: { select: { status: true } };
  };
}>;

function serializeProject(project: ProjectWithRelations): Project {
  const members = project.memberLinks.map((link) => link.teamMember);
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status as Project["status"],
    progress: project.progress,
    memberIds: members.map((m) => m.id),
    members: members.map((m) => m.name),
    taskCount: project.tasks.length,
    completedTaskCount: project.tasks.filter((t) => t.status === "done")
      .length,
    dueDate: fromDateOnly(project.dueDate),
  };
}

const projectInclude = {
  memberLinks: { include: { teamMember: true } },
  tasks: { select: { status: true } },
} satisfies Prisma.ProjectInclude;

export async function getAllProjects(ownerId: string) {
  const projects = await prisma.project.findMany({
    where: { ownerId },
    include: projectInclude,
    orderBy: { createdAt: "asc" },
  });
  return projects.map(serializeProject);
}

export async function getProjectById(id: string, ownerId: string) {
  const project = await prisma.project.findFirst({
    where: { id, ownerId },
    include: projectInclude,
  });
  return project ? serializeProject(project) : null;
}

/**
 * True only if every id in memberIds is a team member owned by ownerId.
 * Called before create/update so a user can't attach someone else's team
 * member to their project just by knowing/guessing its id.
 */
export async function allTeamMembersOwnedBy(
  memberIds: string[],
  ownerId: string
): Promise<boolean> {
  if (memberIds.length === 0) return true;
  const count = await prisma.teamMember.count({
    where: { id: { in: memberIds }, ownerId },
  });
  return count === memberIds.length;
}

export async function createProject(
  data: Omit<Project, "id" | "taskCount" | "completedTaskCount" | "members">,
  ownerId: string
) {
  try {
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        progress: data.progress,
        dueDate: toDateOnly(data.dueDate),
        owner: { connect: { id: ownerId } },
        memberLinks: {
          create: (data.memberIds ?? []).map((teamMemberId) => ({
            teamMember: { connect: { id: teamMemberId } },
          })),
        },
      },
      include: projectInclude,
    });
    return serializeProject(project);
  } catch (err) {
    translatePrismaError(err);
  }
}

export async function updateProject(
  id: string,
  updates: Partial<
    Omit<Project, "id" | "taskCount" | "completedTaskCount" | "members">
  >,
  ownerId: string
) {
  // Ownership check first — updateMany with an empty data patch just to
  // verify ownership, then a real update for the relation fields.
  const owned = await prisma.project.findFirst({
    where: { id, ownerId },
    select: { id: true },
  });
  if (!owned) return null;

  try {
    const { memberIds, dueDate, ...rest } = updates;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate ? { dueDate: toDateOnly(dueDate) } : {}),
        ...(memberIds
          ? {
              memberLinks: {
                deleteMany: {},
                create: memberIds.map((teamMemberId) => ({
                  teamMember: { connect: { id: teamMemberId } },
                })),
              },
            }
          : {}),
      },
      include: projectInclude,
    });
    return serializeProject(project);
  } catch (err) {
    translatePrismaError(err);
  }
}

export async function deleteProject(id: string, ownerId: string) {
  const { count } = await prisma.project.deleteMany({ where: { id, ownerId } });
  return count > 0;
}

// -----------------------------------------------------------------------
// Team members
// -----------------------------------------------------------------------

function serializeTeamMember(member: {
  id: string;
  name: string;
  role: string;
  email: string | null;
}): TeamMember {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    email: member.email ?? undefined,
  };
}

export async function getAllTeamMembers(ownerId: string) {
  const members = await prisma.teamMember.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
  });
  return members.map(serializeTeamMember);
}

export async function getTeamMemberById(id: string, ownerId: string) {
  const member = await prisma.teamMember.findFirst({ where: { id, ownerId } });
  return member ? serializeTeamMember(member) : null;
}

export async function createTeamMember(
  data: Omit<TeamMember, "id">,
  ownerId: string
) {
  try {
    const member = await prisma.teamMember.create({
      data: { ...data, owner: { connect: { id: ownerId } } },
    });
    return serializeTeamMember(member);
  } catch (err) {
    translatePrismaError(err);
  }
}

export async function updateTeamMember(
  id: string,
  updates: Partial<TeamMember>,
  ownerId: string
) {
  const { count } = await prisma.teamMember.updateMany({
    where: { id, ownerId },
    data: updates,
  });
  if (count === 0) return null;
  const member = await prisma.teamMember.findUnique({ where: { id } });
  return member ? serializeTeamMember(member) : null;
}

export async function deleteTeamMember(id: string, ownerId: string) {
  const { count } = await prisma.teamMember.deleteMany({ where: { id, ownerId } });
  return count > 0;
}

// -----------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------

function serializeUser(user: {
  id: string;
  name: string;
  role: string;
  email: string;
  password: string;
  provider: string;
  avatarInitials: string | null;
}): User {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    password: user.password,
    provider: user.provider,
    avatarInitials: user.avatarInitials ?? undefined,
  };
}

export async function getAllUsers() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return users.map(serializeUser);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? serializeUser(user) : null;
}

export async function createUser(data: Omit<User, "id">) {
  if (!data.password) {
    throw new Error("Password is required");
  }
  const hashedPassword = await bcrypt.hash(data.password, 10);
  try {
    const user = await prisma.user.create({
      data: { ...data, password: hashedPassword },
    });
    return serializeUser(user);
  } catch (err) {
    translatePrismaError(err);
  }
}

export async function findOrCreateGoogleUser(profile: { email: string; name: string }) {
  const existing = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existing) return serializeUser(existing);

  // Google users don't set a password — generate one they'll never see or use,
  // so the account still satisfies the schema but can't be logged into via the password form.
  const randomPassword = crypto.randomBytes(32).toString("hex");
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const user = await prisma.user.create({
    data: {
      name: profile.name,
      email: profile.email,
      password: hashedPassword,
      provider: "google",
      role: "Member",
    },
  });
  return serializeUser(user);
}

export async function updateUser(id: string, updates: Partial<User>) {
  const data = { ...updates };
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  try {
    const user = await prisma.user.update({ where: { id }, data });
    return serializeUser(user);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return null;
    }
    translatePrismaError(err);
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return false;
    }
    throw err;
  }
}

export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  return user ? serializeUser(user) : null;
}

// -----------------------------------------------------------------------
// Activity
// -----------------------------------------------------------------------

function serializeActivity(event: {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string | null;
  createdAt: Date;
}): ActivityEvent {
  return {
    id: event.id,
    actor: event.actor,
    action: event.action as ActivityEvent["action"],
    target: event.target,
    detail: event.detail ?? undefined,
    timestamp: event.createdAt.toISOString(),
  };
}

export async function logActivity(data: {
  actor: string;
  action: ActivityEvent["action"];
  target: string;
  detail?: string;
  ownerId: string;
}) {
  await prisma.activity.create({ data });
}

export async function getRecentActivity(ownerId: string, limit = 20) {
  const events = await prisma.activity.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return events.map(serializeActivity);
}

// -----------------------------------------------------------------------
// Dashboard stats
// -----------------------------------------------------------------------

export async function getDashboardStats(ownerId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [activeProjects, tasksCompletedThisWeek, tasksOverdue, teamMembers] =
    await Promise.all([
      prisma.project.count({ where: { ownerId, status: { not: "completed" } } }),
      prisma.task.count({
        where: {
          status: "done",
          updatedAt: { gte: weekAgo },
          project: { ownerId },
        },
      }),
      prisma.task.count({
        where: {
          status: { not: "done" },
          dueDate: { lt: now },
          project: { ownerId },
        },
      }),
      prisma.teamMember.count({ where: { ownerId } }),
    ]);

  return { activeProjects, tasksCompletedThisWeek, tasksOverdue, teamMembers };
}

// -----------------------------------------------------------------------
// Notification Preferences
// -----------------------------------------------------------------------

export async function getNotificationPreferences(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.notificationPreference.create({ data: { userId } });
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<{
    taskAssigned: boolean;
    taskOverdue: boolean;
    weeklySummary: boolean;
  }>
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  });
}

// -----------------------------------------------------------------------
// forgot-password / email reset
// -----------------------------------------------------------------------

export async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return rawToken;
}

export async function consumePasswordResetToken(rawToken: string): Promise<string | null> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.userId;
}