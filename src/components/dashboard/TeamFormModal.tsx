"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMember } from "@/types";

export interface TeamMemberFormValues {
  name: string;
  role: string;
  email?: string;
}

interface TeamFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TeamMemberFormValues) => void;
  initialMember?: TeamMember | null;
  submitting?: boolean;
}

export function TeamFormModal({ open, onClose, onSubmit, initialMember, submitting }: TeamFormModalProps) {
  const [name, setName] = useState(initialMember?.name ?? "");
  const [role, setRole] = useState(initialMember?.role ?? "");
  const [email, setEmail] = useState(initialMember?.email ?? "");

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    onSubmit({
      name: name.trim(),
      role: role.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface-raised border border-surface-border rounded-card shadow-card max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-ink">{initialMember ? "Edit Team Member" : "Add Team Member"}</h2>
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
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Role</label>
            <input
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              placeholder="e.g. Frontend Engineer"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Email <span className="text-ink-faint">(optional)</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              placeholder="name@company.com"
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
              {submitting ? "Saving..." : initialMember ? "Save Changes" : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}