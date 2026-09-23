"use client";

import { useState, useEffect } from "react";
import { Task, TaskStatus, TaskPriority, Project, TeamMember } from "@/types";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineAddMember } from "@/components/dashboard/InlineAddMember";

export interface TaskFormValues {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string;
  projectId?: string;
}

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
  members: TeamMember[];
  onMemberCreated?: (member: TeamMember) => void;
  projects?: Project[];
  initialTask?: Task | null;
  submitting?: boolean;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function TaskFormModal({
  open,
  onClose,
  onSubmit,
  members,
  onMemberCreated,
  projects = [],
  initialTask,
  submitting,
}: TaskFormModalProps) {
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState(initialTask?.assigneeId ?? members[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(initialTask?.dueDate?.slice(0, 10) ?? todayIso());
  const [projectId, setProjectId] = useState(initialTask?.projectId ?? projects[0]?.id ?? "");

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const showProjectSelect = !initialTask && projects.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !assigneeId) return;
    if (showProjectSelect && !projectId) return;
    onSubmit({
      title: title.trim(),
      status,
      priority,
      assigneeId,
      dueDate,
      projectId: initialTask ? initialTask.projectId : projectId,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface-raised border border-surface-border rounded-card shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-ink">
            {initialTask ? "Edit Task" : "Add Task"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-muted hover:text-ink cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Title</label>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              placeholder="Task title"
            />
          </div>

          {showProjectSelect && (
            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">Project</label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Assignee</label>
            <select
              required
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
            >
              {members.length === 0 && <option value="">No team members</option>}
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
              ))}
            </select>
            {onMemberCreated && (
              <div className="mt-2">
                <InlineAddMember
                  onCreated={(member) => {
                    onMemberCreated(member);
                    setAssigneeId(member.id);
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Due Date</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium bg-accent text-white cursor-pointer",
                submitting && "opacity-60 cursor-not-allowed"
              )}
            >
              {submitting ? "Saving..." : initialTask ? "Save Changes" : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}