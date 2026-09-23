"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Project, Task, TeamMember } from "@/types";
import {
  fetchProjectById,
  fetchProjectMembers,
  updateProject,
  deleteProject,
} from "@/lib/api/projects";
import { fetchTeamMembers, updateTeamMember } from "@/lib/api/team";
import { TeamFormModal, TeamMemberFormValues } from "@/components/dashboard/TeamFormModal";
import { fetchProjectTasks, createTask, updateTask, deleteTask } from "@/lib/api/tasks";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { TaskCardSkeleton } from "@/components/dashboard/TaskCardSkeleton";
import { TaskFormModal, TaskFormValues } from "@/components/dashboard/TaskFormModal";
import { ProjectFormModal, ProjectFormValues } from "@/components/dashboard/ProjectFormModal";
import { ArrowLeft, CalendarDays, ListChecks, FolderX, Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { generateTaskSuggestions, summarizeProject, AITaskSuggestion } from "@/lib/api/ai";
import { AITaskSuggestionsModal } from "@/components/dashboard/AITaskSuggestionsModal";

const STATUS_CONFIG: Record<Project["status"], { label: string; badge: "success" | "warning" | "danger" | "info"; bar: "success" | "warning" | "danger" | "info" }> = {
  "on-track": { label: "On Track", badge: "success", bar: "success" },
  "at-risk": { label: "At Risk", badge: "warning", bar: "warning" },
  delayed: { label: "Delayed", badge: "danger", bar: "danger" },
  completed: { label: "Completed", badge: "info", bar: "info" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null | undefined>(undefined); // undefined = loading, null = not found
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [allMembers, setAllMembers] = useState<TeamMember[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [confirmDeleteProjectOpen, setConfirmDeleteProjectOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AITaskSuggestion[]>([]);
  const [aiSubmitting, setAiSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectById(params.id).then(setProject);
    fetchProjectTasks(params.id).then(setTasks);
    fetchTeamMembers().then(setAllMembers);
  }, [params.id]);

  useEffect(() => {
    if (project) {
      fetchProjectMembers(project.memberIds ?? []).then(setMembers);
    }
  }, [project]);

  function openCreateModal() {
    setEditingTask(null);
    setTaskModalOpen(true);
  }

  async function handleMemberCreated(member: TeamMember) {
    // Update immediately so the assignee dropdown has them right away.
    setMembers((prev) => (prev ? [...prev, member] : [member]));

    // Also attach to this project, since the picker on this page is scoped
    // to project.memberIds, not the full account roster — without this
    // they'd vanish from the assignee list again on next reload.
    if (!project) return;
    try {
      const updated = await updateProject(project.id, {
        memberIds: [...(project.memberIds ?? []), member.id],
      });
      setProject(updated);
    } catch (err) {
      console.error("Member was created but couldn't be attached to this project", err);
    }
  }

  function openEditProjectModal() {
    setProjectModalOpen(true);
  }

  async function handleProjectSubmit(values: ProjectFormValues) {
    if (!project) return;
    setSavingProject(true);
    try {
      const updated = await updateProject(project.id, values);
      setProject(updated);
      setMembers(await fetchProjectMembers(updated.memberIds ?? []));
      setProjectModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingProject(false);
    }
  }

  async function confirmDeleteProject() {
    if (!project) return;
    setDeletingProject(true);
    try {
      await deleteProject(project.id);
      router.push("/projects");
    } catch (err) {
      setDeletingProject(false);
      setConfirmDeleteProjectOpen(false);
      alert(err instanceof Error ? err.message : "Failed to delete project");
    }
  }

  // Used by the edit-project modal's inline "add new member" — goes into the
  // full roster (allMembers), not the project-scoped `members` list, since
  // the form lets you pick who to newly attach from the whole account.
  function handleRosterMemberCreated(member: TeamMember) {
    setAllMembers((prev) => (prev ? [...prev, member] : [member]));
  }

  function openEditMemberModal(member: TeamMember) {
    setEditingMember(member);
    setMemberModalOpen(true);
  }

  async function handleMemberEditSubmit(values: TeamMemberFormValues) {
    if (!editingMember) return;
    setSavingMember(true);
    try {
      const updated = await updateTeamMember(editingMember.id, values);
      // Name/role are account-wide, not project-scoped, so keep both lists
      // (this project's members, and the full roster) in sync with the edit.
      setMembers((prev) => prev?.map((m) => (m.id === updated.id ? updated : m)) ?? null);
      setAllMembers((prev) => prev?.map((m) => (m.id === updated.id ? updated : m)) ?? null);
      setMemberModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingMember(false);
    }
  }

  async function confirmRemoveMember() {
    if (!project || !memberToRemove) return;
    setRemovingMember(true);
    try {
      const updated = await updateProject(project.id, {
        memberIds: (project.memberIds ?? []).filter((id) => id !== memberToRemove.id),
      });
      setProject(updated);
      setMembers((prev) => prev?.filter((m) => m.id !== memberToRemove.id) ?? null);
      setMemberToRemove(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingMember(false);
    }
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setTaskModalOpen(true);
  }

  async function handleTaskSubmit(values: TaskFormValues) {
    if (!project) return;
    setSavingTask(true);
    try {
      if (editingTask) {
        const updated = await updateTask(editingTask.id, values);
        setTasks((prev) => prev?.map((item) => (item.id === updated.id ? updated : item)) ?? null);
      } else {
        const created = await createTask({ ...values, projectId: project.id });
        setTasks((prev) => (prev ? [...prev, created] : [created]));
      }
      const refreshed = await fetchProjectById(project.id);
      setProject(refreshed);
      setTaskModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingTask(false);
    }
  }

  async function handleGenerateWithAI() {
    if (!project) return;
    setAiModalOpen(true);
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);
    try {
      const suggestions = await generateTaskSuggestions(project.id);
      setAiSuggestions(suggestions);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate suggestions");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSummarize() {
    if (!project) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await summarizeProject(project.id);
      setSummary(result);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleConfirmAiSuggestions(selected: AITaskSuggestion[]) {
    if (!project) return;
    setAiSubmitting(true);
    try {
      const created = await Promise.all(
        selected.map((s) =>
          createTask({
            title: s.title,
            status: "todo",
            priority: s.priority,
            projectId: project.id,
            assigneeId: null,
            dueDate: s.dueDate,
          })
        )
      );
      setTasks((prev) => (prev ? [...prev, ...created] : created));
      const refreshed = await fetchProjectById(project.id);
      setProject(refreshed);
      setAiModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add tasks");
    } finally {
      setAiSubmitting(false);
    }
  }

  function requestDeleteTask(task: Task) {
    setTaskToDelete(task);
  }

  async function confirmDeleteTask() {
    if (!project || !taskToDelete) return;

    const taskId = taskToDelete.id;
    const previousTasks = tasks;
    setTasks((prev) => prev?.filter((item) => item.id !== taskId) ?? null);
    setTaskToDelete(null);

    try {
      await deleteTask(taskId);
      const refreshed = await fetchProjectById(project.id);
      setProject(refreshed);
    } catch (err) {
      setTasks(previousTasks);
      alert(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  if (project === undefined) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          icon={FolderX}
          title="Project not found"
          description="This project may have been removed or the link is incorrect."
        />
      </div>
    );
  }

  const config = STATUS_CONFIG[project.status];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <button
        type="button"
        onClick={() => router.push("/projects")}
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </button>

      {/* OVERVIEW */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{project.name}</h1>
            <p className="text-sm text-ink-muted mt-1">{project.description}</p>
            <p className="text-xs text-ink-muted font-mono mt-1">ID: {project.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSummarize}
              disabled={summaryLoading}
              className="flex items-center gap-1 text-xs font-medium text-accent hover:underline cursor-pointer disabled:opacity-60 disabled:no-underline disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {summaryLoading ? "Summarizing..." : "Summarize"}
            </button>
            <button
              type="button"
              onClick={openEditProjectModal}
              aria-label="Edit project"
              className="text-ink-faint hover:text-ink cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteProjectOpen(true)}
              aria-label="Delete project"
              className="text-ink-faint hover:text-status-danger cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <Badge status={config.badge}>{config.label}</Badge>
          </div>
        </div>

        <ProgressBar value={project.progress} status={config.bar} label="Progress" />

        <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted pt-2 border-t border-surface-border">
          <span className="flex items-center gap-1.5">
            <ListChecks className="w-4 h-4" />
            {project.completedTaskCount}/{project.taskCount} tasks completed
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" />
            Due {formatDate(project.dueDate)}
          </span>
        </div>

        {summaryError && (
          <p className="text-xs text-status-danger pt-2 border-t border-surface-border">{summaryError}</p>
        )}

        {summary && !summaryError && (
          <div className="flex items-start gap-2 pt-2 border-t border-surface-border">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-ink-muted">{summary}</p>
          </div>
        )}
      </Card>

      {/* TEAM MEMBERS */}
      <section>
        <h2 className="text-sm font-semibold text-ink mb-3">Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members === null
            ? Array.from({ length: project.members.length || 3 }).map((_, i) => (
                <Card key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </Card>
              ))
            : members.map((m) => (
                <Card key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{m.name}</p>
                    <p className="text-xs text-ink-muted">{m.role}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label="Edit member"
                      onClick={() => openEditMemberModal(m)}
                      className="text-ink-faint hover:text-ink cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove from project"
                      onClick={() => setMemberToRemove(m)}
                      className="text-ink-faint hover:text-status-danger cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
        </div>
      </section>

      {/* PROJECT TASKS */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">Tasks</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateWithAI}
              className="flex items-center gap-1 text-xs font-medium text-accent hover:underline cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate with AI
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          </div>
        </div>
        {tasks === null ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onEdit={() => openEditModal(t)}
                onDelete={() => requestDeleteTask(t)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description="This project has no tasks assigned."
          />
        )}
      </section>

      <TaskFormModal
        key={`task-modal-${taskModalOpen ? (editingTask?.id ?? "new") : "closed"}`}
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        members={members ?? []}
        onMemberCreated={handleMemberCreated}
        initialTask={editingTask}
        submitting={savingTask}
      />

      <ConfirmDialog
        open={!!taskToDelete}
        title="Delete task?"
        message="Delete this task? This can't be undone."
        onConfirm={confirmDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />

      <ProjectFormModal
        key={`project-modal-${projectModalOpen ? "editing" : "closed"}`}
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSubmit={handleProjectSubmit}
        members={allMembers ?? []}
        onMemberCreated={handleRosterMemberCreated}
        initialProject={project}
        submitting={savingProject}
      />

      <ConfirmDialog
        open={confirmDeleteProjectOpen}
        title="Delete project?"
        message={`"${project.name}" and all of its tasks will be permanently removed. This can't be undone.`}
        confirmLabel={deletingProject ? "Deleting..." : "Yes, delete"}
        cancelLabel="No"
        onConfirm={confirmDeleteProject}
        onCancel={() => setConfirmDeleteProjectOpen(false)}
      />

      <TeamFormModal
        key={memberModalOpen ? `member-modal-${editingMember?.id ?? "none"}` : "member-modal-closed"}
        open={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        onSubmit={handleMemberEditSubmit}
        initialMember={editingMember}
        submitting={savingMember}
      />

      <ConfirmDialog
        open={!!memberToRemove}
        title="Remove from project?"
        message={
          memberToRemove
            ? `${memberToRemove.name} will no longer be assignable to tasks in this project. They stay on your team roster.`
            : ""
        }
        confirmLabel={removingMember ? "Removing..." : "Yes, remove"}
        cancelLabel="No"
        onConfirm={confirmRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />

      <AITaskSuggestionsModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        loading={aiLoading}
        error={aiError}
        suggestions={aiSuggestions}
        onConfirm={handleConfirmAiSuggestions}
        submitting={aiSubmitting}
      />
    </div>
  );
}