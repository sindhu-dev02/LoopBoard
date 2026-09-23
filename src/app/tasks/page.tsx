"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Task, TaskPriority, TaskStatus, Project, TeamMember } from "@/types";
import { fetchTeamMembers } from "@/lib/api/team";
import { fetchProjects } from "@/lib/api/projects";
import { fetchTasks, createTask, updateTask, deleteTask } from "@/lib/api/tasks";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { TaskCardSkeleton } from "@/components/dashboard/TaskCardSkeleton";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskFormModal, TaskFormValues } from "@/components/dashboard/TaskFormModal";
import { cn } from "@/lib/utils";
import { ListChecks, List, LayoutGrid, Plus, Search } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function isOverdue(task: Task) {
  return new Date(task.dueDate) < new Date() && task.status !== "done";
}

type SortKey = "dueDate" | "priority" | "title";
const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };

function TasksContent() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [view, setView] = useState<"list" | "board">("list");

  const [searchInput, setSearchInput] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<TaskStatus>("in-progress");
  const [bulkApplying, setBulkApplying] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [savingTask, setSavingTask] = useState(false);

  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const overdue = searchParams.get("overdue") === "true";
  const isFiltered = Boolean(status || overdue);

  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);

  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchTasks().then(setTasks);
    fetchTeamMembers().then(setMembers);
    fetchProjects().then(setProjects);
  }, []);

  function reloadTasks() {
    fetchTasks().then(setTasks);
  }

  const baseFiltered = useMemo(() => {
    if (!tasks) return null;
    if (overdue) return tasks.filter(isOverdue);
    if (status) return tasks.filter((t) => t.status === status);
    return tasks;
  }, [tasks, status, overdue]);

  const searchedAndFiltered = useMemo(() => {
    if (!baseFiltered) return null;
    let result = baseFiltered;
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.assignee?.toLowerCase().includes(q) ?? false)
      );
    }
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    return result;
  }, [baseFiltered, searchInput, priorityFilter]);

  const sorted = useMemo(() => {
    if (!searchedAndFiltered) return null;
    const copy = [...searchedAndFiltered];
    copy.sort((a, b) => {
      if (sortKey === "dueDate") return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (sortKey === "priority") return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      return a.title.localeCompare(b.title);
    });
    return copy;
  }, [searchedAndFiltered, sortKey]);

  const heading = overdue ? "Overdue tasks" : status === "done" ? "Completed tasks" : "Tasks";
  const subtitle = overdue
    ? "Tasks past their due date that aren't done yet"
    : status === "done"
    ? "Tasks marked as done"
    : null;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!sorted) return;
    setSelectedIds((prev) =>
      prev.size === sorted.length ? new Set() : new Set(sorted.map((t) => t.id))
    );
  }

  async function applyBulkStatus() {
    if (selectedIds.size === 0) return;
    setBulkApplying(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => updateTask(id, { status: bulkStatus })));
      reloadTasks();
      setSelectedIds(new Set());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setBulkApplying(false);
    }
  }

  function openCreateModal() {
    setEditingTask(null);
    setTaskModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setTaskModalOpen(true);
  }

  async function handleTaskSubmit(values: TaskFormValues) {
    setSavingTask(true);
    try {
      if (editingTask) {
        const updated = await updateTask(editingTask.id, values);
        setTasks((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? null);
      } else {
        if (!values.projectId) return;
        const created = await createTask({
          title: values.title,
          status: values.status,
          priority: values.priority,
          assigneeId: values.assigneeId,
          dueDate: values.dueDate,
          projectId: values.projectId,
        });
        setTasks((prev) => (prev ? [...prev, created] : [created]));
      }
      setTaskModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingTask(false);
    }
  }

  function requestDeleteTask(task: Task) {
    setTaskPendingDelete(task);
  }

    async function confirmDeleteTask() {
      if (!taskPendingDelete) return;
      const taskId = taskPendingDelete.id;
      const previous = tasks;
      setTasks((prev) => prev?.filter((t) => t.id !== taskId) ?? null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      setTaskPendingDelete(null);
      try {
        await deleteTask(taskId);
      } catch (err) {
        setTasks(previous);
        alert(err instanceof Error ? err.message : "Failed to delete task");
      }
    }

  const showListControls = view === "list" || isFiltered;

  async function confirmBulkDeleteTasks() {
    if (selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);
    const previous = tasks;

    setTasks((prev) =>
      prev?.filter((task) => !selectedIds.has(task.id)) ?? null
    );
    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);

    try {
      await Promise.all(idsToDelete.map((id) => deleteTask(id)));
    } catch (err) {
      setTasks(previous);
      alert(err instanceof Error ? err.message : "Failed to delete tasks");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{heading}</h1>
          {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
          {!isFiltered && (
            <div className="flex items-center gap-1 p-1 bg-surface-raised border border-surface-border rounded-card">
              <button
                type="button"
                onClick={() => { setView("list"); setSelectedIds(new Set()); }}
                aria-pressed={view === "list"}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                  view === "list" ? "bg-surface text-ink" : "text-ink-muted hover:text-ink"
                )}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                type="button"
                onClick={() => { setView("board"); setSelectedIds(new Set()); }}
                aria-pressed={view === "board"}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                  view === "board" ? "bg-surface text-ink" : "text-ink-muted hover:text-ink"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                Board
              </button>
            </div>
          )}
        </div>
      </div>

      {showListControls && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title or assignee..."
              className="w-full pl-8 pr-3 py-2 rounded-md border border-surface-border bg-surface text-sm text-ink outline-none focus-visible:border-accent"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "all")}
            className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
          >
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
          >
            <option value="dueDate">Sort: Due date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </select>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-accent/10 border border-accent/30 rounded-card px-4 py-2.5">
          <span className="text-sm text-ink">{selectedIds.size} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as TaskStatus)}
            className="rounded-md border border-surface-border bg-surface px-2 py-1 text-sm text-ink outline-none"
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="done">Done</option>
          </select>
          <button
            type="button"
            onClick={applyBulkStatus}
            disabled={bulkApplying}
            className={cn(
              "px-3 py-1 rounded-md text-sm font-medium bg-accent text-white cursor-pointer",
              bulkApplying && "opacity-60 cursor-not-allowed"
            )}
          >
            {bulkApplying ? "Applying..." : "Apply"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-ink-muted hover:text-ink cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setBulkDeleteConfirm(true)}
            className="text-sm text-ink-muted hover:text-ink cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}

      {view === "board" && !isFiltered ? (
        tasks === null ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 min-w-[280px] flex-1">
                <TaskCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <KanbanBoard
            key={`${searchInput}-${priorityFilter}`}
            initialTasks={searchedAndFiltered ?? []}
          />
        )
      ) : (
        <div className="space-y-2">
          {sorted === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <TaskCardSkeleton key={i} />)}
            </div>
          ) : sorted.length > 0 ? (
            <>
              <label className="flex items-center gap-2 text-xs text-ink-muted px-1">
                <input
                  type="checkbox"
                  checked={selectedIds.size === sorted.length}
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
                Select all
              </label>
              {sorted.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    className="cursor-pointer shrink-0"
                  />
                  <div className="flex-1">
                    <TaskCard
                      task={t}
                      onEdit={() => openEditModal(t)}
                      onDelete={() => requestDeleteTask(t)}
                    />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <EmptyState
              icon={ListChecks}
              title="No tasks found"
              description="Nothing matches this filter right now."
            />
          )}
        </div>
      )}

      <TaskFormModal
        key={taskModalOpen ? (editingTask?.id ?? "new") : "closed"}
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        members={members ?? []}
        onMemberCreated={(m) => setMembers((prev) => (prev ? [...prev, m] : [m]))}
        projects={projects ?? []}
        initialTask={editingTask}
        submitting={savingTask}
      />
      {/* Single task delete */}
      <ConfirmDialog
        open={taskPendingDelete !== null}
        title="Delete task?"
        message={
          taskPendingDelete
            ? `"${taskPendingDelete.title}" will be permanently removed.`
            : ""
        }
        confirmLabel="Yes, delete"
        cancelLabel="No"
        onConfirm={confirmDeleteTask}
        onCancel={() => setTaskPendingDelete(null)}
      />

      {/* Bulk delete */}
      <ConfirmDialog
        open={bulkDeleteConfirm}
        title="Delete selected tasks?"
        message={`${selectedIds.size} selected task${
          selectedIds.size === 1 ? "" : "s"
        } will be permanently removed.`}
        confirmLabel="Yes, delete"
        cancelLabel="No"
        onConfirm={confirmBulkDeleteTasks}
        onCancel={() => setBulkDeleteConfirm(false)}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksContent />
    </Suspense>
  );
}