export type TaskStatus = "todo" | "in-progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type ProjectStatus = "on-track" | "at-risk" | "delayed" | "completed";
export type ActivityAction = "created" | "status-changed" | "commented" | "completed";

export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  password?: string; // mock-only, never do this in a real app
  provider?: string;
  avatarInitials?: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  /** FK to TeamMember.id — the source of truth for who owns this task. */
  assigneeId?: string | null;
  /** Resolved from `assigneeId` server-side; kept for existing frontend compatibility. */
  assignee: string | null;
  dueDate: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  /** FKs to TeamMember.id via the ProjectMember join table — the source of truth. */
  memberIds?: string[];
  /** Resolved from `memberIds` server-side; kept for existing frontend compatibility. */
  members: string[];
  taskCount: number;
  completedTaskCount: number;
  dueDate: string;
}

export interface DashboardStats {
  activeProjects: number;
  tasksCompletedThisWeek: number;
  tasksOverdue: number;
  teamMembers: number;
}

export interface ActivityEvent {
  id: string;
  actor: string;
  action: ActivityAction;
  target: string;
  detail?: string;
  timestamp: string;
}

export interface StatusBreakdown {
  status: TaskStatus;
  count: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  read: boolean;
  timestamp: string;
}

export interface NotificationPreferences {
  taskAssigned: boolean;
  taskOverdue: boolean;
  comments: boolean;
  weeklySummary: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
}