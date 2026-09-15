import {
  Project,
  Task,
  DashboardStats,
  User,
  TaskStatus,
  TaskPriority,
  ActivityEvent,
  NotificationItem,
  ProjectStatus,
  TeamMember
} from "@/types";
import { DEV_CONFIG, setDevConfig } from "@/lib/devConfig";
export { DEV_CONFIG, setDevConfig };

export const CURRENT_USER: User = {
  id: "u1",
  name: "Sarah Patel",
  role: "Frontend Engineer",
  email: "sarah@xyz.com",
  password: "password123", // mock only — for demo change-password validation
};

const PROJECTS: Project[] = [
  { id: "p1", name: "Design System v2", description: "Unify tokens and components across product surfaces.", status: "on-track", progress: 72, members: ["Sarah Patel", "Alex Kim", "Jo Chen"], taskCount: 24, completedTaskCount: 17, dueDate: "2026-09-15" },
  { id: "p2", name: "API Gateway Migration", description: "Move legacy REST endpoints to the new gateway.", status: "at-risk", progress: 41, members: ["Max Lee", "Priya Rao"], taskCount: 18, completedTaskCount: 7, dueDate: "2026-09-01" },
  { id: "p3", name: "Mobile Onboarding Revamp", description: "Redesign first-run experience for iOS and Android.", status: "delayed", progress: 25, members: ["Jo Chen", "Sarah Patel", "Max Lee", "Priya Rao"], taskCount: 30, completedTaskCount: 6, dueDate: "2026-08-30" },
  { id: "p4", name: "Analytics Pipeline", description: "Event tracking and dashboarding for product usage.", status: "completed", progress: 100, members: ["Alex Kim"], taskCount: 14, completedTaskCount: 14, dueDate: "2026-08-10" },
];

const TASKS: Task[] = [
  { id: "t1", title: "Finalize color token naming", status: "in-progress", priority: "high", projectId: "p1", assignee: "Sarah Patel", dueDate: "2026-08-25" },
  { id: "t2", title: "Audit legacy auth endpoints", status: "todo", priority: "high", projectId: "p2", assignee: "Max Lee", dueDate: "2026-08-24" },
  { id: "t3", title: "Write onboarding copy v2", status: "review", priority: "medium", projectId: "p3", assignee: "Jo Chen", dueDate: "2026-08-27" },
  { id: "t4", title: "Set up rate limiting", status: "todo", priority: "high", projectId: "p2", assignee: "Priya Rao", dueDate: "2026-08-26" },
  { id: "t5", title: "Component docs pass", status: "done", priority: "low", projectId: "p1", assignee: "Alex Kim", dueDate: "2026-08-20" },
  { id: "t6", title: "Prototype swipe gestures", status: "in-progress", priority: "medium", projectId: "p3", assignee: "Sarah Patel", dueDate: "2026-08-29" },
];

function recalcProjectCounts(projectId: string) {
  const project = PROJECTS.find((p) => p.id === projectId);
  if (!project) return;
  const projectTasks = TASKS.filter((t) => t.projectId === projectId);
  project.taskCount = projectTasks.length;
  project.completedTaskCount = projectTasks.filter((t) => t.status === "done").length;
}

let projectIdCounter = PROJECTS.length + 1;

export interface CreateProjectInput {
  name: string;
  description: string;
  status: ProjectStatus;
  members: string[];
  dueDate: string;
}

export async function createProject(input: CreateProjectInput, opts: FetchOptions = {}): Promise<Project> {
  await delay(opts.delayMs ?? 500);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to create project");

  const project: Project = {
    id: `p${projectIdCounter++}`,
    ...input,
    progress: 0,
    taskCount: 0,
    completedTaskCount: 0,
  };
  PROJECTS.push(project);

  ACTIVITY.unshift({
    id: `a${activityIdCounter++}`,
    actor: CURRENT_USER.name,
    action: "created",
    target: project.name,
    detail: "New project created",
    timestamp: new Date().toISOString(),
  });

  return project;
}

export const NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", title: "Task assigned", description: "You were assigned 'Set up rate limiting'", read: false, timestamp: "2026-08-25T08:00:00Z" },
  { id: "n2", title: "Task overdue", description: "'Audit legacy auth endpoints' is overdue", read: false, timestamp: "2026-08-24T20:00:00Z" },
  { id: "n3", title: "Comment added", description: "Jo Chen commented on 'Write onboarding copy v2'", read: true, timestamp: "2026-08-24T11:05:00Z" },
];


const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  review: "In Review",
  done: "Done",
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, DEV_CONFIG.delayMs ?? ms));
}

interface FetchOptions {
  simulateError?: boolean;
  delayMs?: number;
}

export async function fetchProjects(opts: FetchOptions = {}): Promise<Project[]> {
  await delay(opts.delayMs ?? 900);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to load projects");
  return PROJECTS;
}

export async function fetchProjectById(id: string, opts: FetchOptions = {}): Promise<Project | null> {
  await delay(opts.delayMs ?? 500);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to load project");
  return PROJECTS.find((p) => p.id === id) ?? null;
}

export async function fetchProjectTasks(projectId: string, opts: FetchOptions = {}): Promise<Task[]> {
  await delay(opts.delayMs ?? 500);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to load project tasks");
  return TASKS.filter((t) => t.projectId === projectId);
}

export async function fetchProjectMembers(memberNames: string[], opts: FetchOptions = {}): Promise<TeamMember[]> {
  await delay(opts.delayMs ?? 500);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to load project members");
  return memberNames.map((name) => {
    const match = TEAM_MEMBERS.find((m) => m.name === name);
    return match ?? { id: name, name, role: "Contributor", email: "—" };
  });
}

export async function fetchTasks(opts: FetchOptions = {}): Promise<Task[]> {
  await delay(opts.delayMs ?? 700);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to load tasks");
  return TASKS;
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  opts: FetchOptions = {}
): Promise<Task> {
  await delay(opts.delayMs ?? 250);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to update task");
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) throw new Error("Task not found");

  const previousStatus = task.status;
  task.status = status;
  recalcProjectCounts(task.projectId);

  if (previousStatus !== status) {
    ACTIVITY.unshift({
      id: `a${activityIdCounter++}`,
      actor: CURRENT_USER.name,
      action: status === "done" ? "completed" : "status-changed",
      target: task.title,
      detail: status === "done" ? undefined : `Moved to ${STATUS_LABELS[status]}`,
      timestamp: new Date().toISOString(),
    });
  }

  return task;
}

export async function fetchStats(opts: FetchOptions = {}): Promise<DashboardStats> {
  await delay(opts.delayMs ?? 500);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to load stats");
  return {
    activeProjects: PROJECTS.filter((p) => p.status !== "completed").length,
    tasksCompletedThisWeek: TASKS.filter((t) => t.status === "done").length,
    tasksOverdue: TASKS.filter((t) => new Date(t.dueDate) < new Date() && t.status !== "done").length,
    teamMembers: 4,
  };
}

export async function fetchEmptyProjects(): Promise<Project[]> {
  await delay(600);
  return [];
}

const TEAM_MEMBERS: TeamMember[] = [
  { id: "m1", name: "Sarah Patel", role: "Frontend Engineer", email: "sarah@xyz.com" },
  { id: "m2", name: "Alex Kim", role: "Product Designer", email: "alex@xyz.com" },
  { id: "m3", name: "Jo Chen", role: "Backend Engineer", email: "joe@xyz.com" },
  { id: "m4", name: "Max Lee", role: "Full-stack Engineer", email: "max@xyz.com" },
];

const ACTIVITY: ActivityEvent[] = [
  { id: "a1", actor: "Alex Kim", action: "completed", target: "Component docs pass", timestamp: "2026-08-24T15:20:00Z" },
  { id: "a2", actor: "Jo Chen", action: "commented", target: "Write onboarding copy v2", detail: "Left feedback on tone", timestamp: "2026-08-24T11:05:00Z" },
  { id: "a3", actor: "Sarah Patel", action: "status-changed", target: "Finalize color token naming", detail: "Moved to In Progress", timestamp: "2026-08-23T18:40:00Z" },
  { id: "a4", actor: "Priya Rao", action: "created", target: "Set up rate limiting", timestamp: "2026-08-22T09:15:00Z" },
  { id: "a5", actor: "Max Lee", action: "created", target: "Audit legacy auth endpoints", timestamp: "2026-08-21T14:30:00Z" },
];

export async function fetchTeamMembers(opts: FetchOptions = {}): Promise<TeamMember[]> {
  await delay(opts.delayMs ?? 600);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to load team members");
  return TEAM_MEMBERS;
}

let activityIdCounter = ACTIVITY.length + 1;

export async function fetchActivity(opts: FetchOptions = {}): Promise<ActivityEvent[]> {
  await delay(opts.delayMs ?? 650);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to load activity");
  return [...ACTIVITY].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function fetchNotifications(opts: FetchOptions = {}): Promise<NotificationItem[]> {
  await delay(opts.delayMs ?? 400);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to load notifications");
  return [...NOTIFICATIONS].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function markNotificationRead(id: string): Promise<void> {
  await delay(150);
  const n = NOTIFICATIONS.find((x) => x.id === id);
  if (n) n.read = true;
}

export interface NotificationPreferences {
  taskAssigned: boolean;
  taskOverdue: boolean;
  comments: boolean;
  weeklySummary: boolean;
}

let NOTIFICATION_PREFERENCES: NotificationPreferences = {
  taskAssigned: true,
  taskOverdue: true,
  comments: true,
  weeklySummary: false,
};

export async function fetchNotificationPreferences(opts: FetchOptions = {}): Promise<NotificationPreferences> {
  await delay(opts.delayMs ?? 400);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to load notification preferences");
  return { ...NOTIFICATION_PREFERENCES };
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>,
  opts: FetchOptions = {}
): Promise<NotificationPreferences> {
  await delay(opts.delayMs ?? 300);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to update notification preferences");
  NOTIFICATION_PREFERENCES = { ...NOTIFICATION_PREFERENCES, ...patch };
  return { ...NOTIFICATION_PREFERENCES };
}

let taskIdCounter = TASKS.length + 1;

export interface CreateTaskInput {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assignee: string;
  dueDate: string;
}

export async function createTask(input: CreateTaskInput, opts: FetchOptions = {}): Promise<Task> {
  await delay(opts.delayMs ?? 400);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to create task");

  const task: Task = { id: `t${taskIdCounter++}`, ...input };
  TASKS.push(task);
  recalcProjectCounts(task.projectId);

  ACTIVITY.unshift({
    id: `a${activityIdCounter++}`,
    actor: CURRENT_USER.name,
    action: "created",
    target: task.title,
    timestamp: new Date().toISOString(),
  });

  return task;
}

export async function updateCurrentUser(patch: Partial<User>, opts: FetchOptions = {}): Promise<User> {
  await delay(opts.delayMs ?? 400);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to update profile");
  Object.assign(CURRENT_USER, patch);
  return CURRENT_USER;
}

export interface UpdateTaskInput {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  dueDate?: string;
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
  opts: FetchOptions = {}
): Promise<Task> {
  await delay(opts.delayMs ?? 400);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to update task");

  const task = TASKS.find((t) => t.id === taskId);
  if (!task) throw new Error("Task not found");

  const previousStatus = task.status;
  const previousAssignee = task.assignee;
  Object.assign(task, input);

  if (input.status && input.status !== previousStatus) {
    recalcProjectCounts(task.projectId);
    ACTIVITY.unshift({
      id: `a${activityIdCounter++}`,
      actor: CURRENT_USER.name,
      action: task.status === "done" ? "completed" : "status-changed",
      target: task.title,
      detail: task.status === "done" ? undefined : `Moved to ${STATUS_LABELS[task.status]}`,
      timestamp: new Date().toISOString(),
    });
  }

  if (input.assignee && input.assignee !== previousAssignee) {
    ACTIVITY.unshift({
      id: `a${activityIdCounter++}`,
      actor: CURRENT_USER.name,
      action: "status-changed",
      target: task.title,
      detail: `Reassigned to ${task.assignee}`,
      timestamp: new Date().toISOString(),
    });
  }

  return task;
}

export async function deleteTask(taskId: string, opts: FetchOptions = {}): Promise<void> {
  await delay(opts.delayMs ?? 300);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to delete task");

  const index = TASKS.findIndex((t) => t.id === taskId);
  if (index === -1) throw new Error("Task not found");

  const [removed] = TASKS.splice(index, 1);
  recalcProjectCounts(removed.projectId);
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string,
  opts: FetchOptions = {}
): Promise<void> {
  await delay(opts.delayMs ?? 500);
  if (opts.simulateError || DEV_CONFIG.simulateError) throw new Error("Failed to update password");
  if (CURRENT_USER.password !== currentPassword) {
    throw new Error("Current password is incorrect");
  }
  CURRENT_USER.password = newPassword;
}