"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TeamMember } from "@/types";
import { createTeamMember } from "@/lib/api/team";
import { cn } from "@/lib/utils";

interface InlineAddMemberProps {
  onCreated: (member: TeamMember) => void;
}

/**
 * A collapsed "+ Add new member" affordance that expands into a tiny
 * name/role form, used inside the project and task modals so a user isn't
 * forced to abandon what they're doing just to go add someone on the Team
 * page first. Deliberately name + role only (no email) — this is a quick
 * roster add, not an invite flow.
 */
export function InlineAddMember({ onCreated }: InlineAddMemberProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim() || !role.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const member = await createTeamMember({ name: name.trim(), role: role.trim() });
      onCreated(member);
      setName("");
      setRole("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add member");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-pill text-xs border border-dashed border-surface-border text-ink-muted hover:text-ink hover:border-accent cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        Add new member
      </button>
    );
  }

  return (
    <div className="w-full border border-surface-border rounded-md p-3 space-y-2 bg-surface">
      <div className="grid grid-cols-2 gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded-md border border-surface-border bg-surface-raised px-2 py-1.5 text-xs text-ink outline-none focus-visible:border-accent"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className="w-full rounded-md border border-surface-border bg-surface-raised px-2 py-1.5 text-xs text-ink outline-none focus-visible:border-accent"
        />
      </div>
      {error && <p className="text-xs text-status-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="text-xs text-ink-muted hover:text-ink cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !name.trim() || !role.trim()}
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-medium bg-accent text-white cursor-pointer",
            (saving || !name.trim() || !role.trim()) && "opacity-60 cursor-not-allowed"
          )}
        >
          {saving ? "Adding..." : "Add"}
        </button>
      </div>
    </div>
  );
}