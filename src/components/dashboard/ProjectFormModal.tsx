"use client";

import { useState, useEffect } from "react";
import { Project, ProjectStatus, TeamMember } from "@/types";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineAddMember } from "@/components/dashboard/InlineAddMember";

export interface ProjectFormValues {
  name: string;
  description: string;
  status: ProjectStatus;
  memberIds: string[];
  dueDate: string;
}

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => void;
  members: TeamMember[];
  onMemberCreated?: (member: TeamMember) => void;
  initialProject?: Project | null;
  submitting?: boolean;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "on-track", label: "On Track" },
  { value: "at-risk", label: "At Risk" },
  { value: "delayed", label: "Delayed" },
  { value: "completed", label: "Completed" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ProjectFormModal({ open, onClose, onSubmit, members, onMemberCreated, initialProject, submitting }: ProjectFormModalProps) {
  const [name, setName] = useState(initialProject?.name ?? "");
  const [description, setDescription] = useState(initialProject?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(initialProject?.status ?? "on-track");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(initialProject?.memberIds ?? []);
  const [dueDate, setDueDate] = useState(initialProject?.dueDate?.slice(0, 10) ?? todayIso());

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), status, memberIds: selectedMemberIds, dueDate });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface-raised border border-surface-border rounded-card shadow-card max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-ink">{initialProject ? "Edit Project" : "New Project"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-muted hover:text-ink cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Name</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              placeholder="Project name"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent resize-none"
              placeholder="What's this project about?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
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
          </div>

          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Team Members</label>
            <div className="flex flex-wrap items-start gap-2">
              {members.map((m) => {
                const active = selectedMemberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-pill text-xs border cursor-pointer transition-colors",
                      active
                        ? "border-accent bg-accent/10 text-ink"
                        : "border-surface-border text-ink-muted hover:text-ink"
                    )}
                  >
                    {m.name}
                  </button>
                );
              })}
              {onMemberCreated && (
                <InlineAddMember
                  onCreated={(member) => {
                    onMemberCreated(member);
                    setSelectedMemberIds((prev) => [...prev, member.id]);
                  }}
                />
              )}
            </div>
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
              {submitting ? "Saving..." : initialProject ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}