"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { fetchNotificationPreferences, updateNotificationPreferences } from "@/lib/api/notifications";
import { NotificationPreferences } from "@/types";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { User, Palette, Bell, Terminal, Check, Sun, Moon, Monitor, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateProfile, changePassword } from "@/lib/api/users";
import { PasswordStrengthHints } from "@/components/ui/PasswordStrengthHints";
import { getFirstPasswordError } from "@/lib/passwordRules";
import { setDevConfig } from "@/lib/devConfig";

function SavedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-status-success">
      <Check className="w-3.5 h-3.5" />
      Saved
    </span>
  );
}

function ProfileSection() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState(user?.role ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateProfile(user!.id, { name, role, email });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-ink-muted" />
        <h2 className="text-sm font-semibold text-ink">Profile</h2>
      </div>

      <div className="flex items-center gap-4">
        <Avatar name={name || "?"} size="lg" />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">User ID</label>
            <input
              value={user.id}
              readOnly
              disabled
              className="w-full rounded-md border border-surface-border bg-surface-border/30 px-3 py-2 text-sm text-ink-muted cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {error && <span className="text-xs text-status-danger mr-auto">{error}</span>}
        <SavedBadge show={saved} />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium bg-accent text-white cursor-pointer",
            saving && "opacity-60 cursor-not-allowed"
          )}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </Card>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      setSaved(false);

      const passwordError = getFirstPasswordError(newPassword);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New password and confirmation don't match.");
        return;
      }

      setSaving(true);
      try {
        await changePassword(currentPassword, newPassword);
        setSaved(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update password");
      } finally {
        setSaving(false);
      }
    }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-ink-muted" />
        <h2 className="text-sm font-semibold text-ink">Change Password</h2>
      </div>
      <p className="text-xs text-ink-muted -mt-2">
        Changes your real account password. You&apos;ll need your current password to confirm.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-ink-muted block mb-1">Current Password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted block mb-1">New Password</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
          />
          <PasswordStrengthHints password={newPassword} className="sm:grid-cols-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted block mb-1">Confirm New Password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
          />
        </div>

        <div className="sm:col-span-3 flex items-center justify-end gap-3">
          {error && <span className="text-xs text-status-danger mr-auto">{error}</span>}
          <SavedBadge show={saved} />
          <button
            type="submit"
            disabled={saving}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium bg-accent text-white cursor-pointer",
              saving && "opacity-60 cursor-not-allowed"
            )}
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-ink-muted" />
          <h2 className="text-sm font-semibold text-ink">Appearance</h2>
        </div>
        <Skeleton className="h-10 w-full" />
      </Card>
    );
  }

  const options: { value: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-ink-muted" />
        <h2 className="text-sm font-semibold text-ink">Appearance</h2>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md border text-sm cursor-pointer transition-colors",
                active
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-surface-border text-ink-muted hover:text-ink"
              )}
            >
              <Icon className="w-4 h-4" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

const PREF_LABELS: Record<keyof NotificationPreferences, string> = {
  taskAssigned: "Task assigned to me",
  taskOverdue: "Task overdue reminders",
  comments: "Comments on my tasks",
  weeklySummary: "Weekly summary email",
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative w-9 h-5 rounded-pill transition-colors cursor-pointer shrink-0",
        checked ? "bg-accent" : "bg-surface-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          checked && "translate-x-4"
        )}
      />
    </button>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchNotificationPreferences().then(setPrefs);
  }, []);

  async function handleToggle(key: keyof NotificationPreferences) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaved(false);
    try {
      await updateNotificationPreferences({ [key]: next[key] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setPrefs(prefs);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-ink-muted" />
          <h2 className="text-sm font-semibold text-ink">Notification Preferences</h2>
        </div>
        <SavedBadge show={saved} />
      </div>

      {prefs === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-surface-border">
          {(Object.keys(PREF_LABELS) as (keyof NotificationPreferences)[]).map((key) => (
            <div key={key} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-ink">{PREF_LABELS[key]}</span>
              <Toggle checked={prefs[key]} onChange={() => handleToggle(key)} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DeveloperSection() {
  const [simulateError, setSimulateError] = useState(false);
  const [delayMs, setDelayMs] = useState("");
  const [applied, setApplied] = useState(false);

  function handleApply() {
    setDevConfig({
      simulateError,
      delayMs: delayMs ? Number(delayMs) : null,
    });
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-ink-muted" />
        <h2 className="text-sm font-semibold text-ink">Developer / Demo Controls</h2>
      </div>
      <p className="text-xs text-ink-muted -mt-2">
        Affects mock data calls app-wide — useful for testing loading and error states.
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm text-ink">Force simulated errors</span>
        <Toggle checked={simulateError} onChange={() => setSimulateError((v) => !v)} />
      </div>

      <div>
        <label className="text-xs font-medium text-ink-muted block mb-1">
          Override fetch delay (ms) — leave blank for defaults
        </label>
        <input
          type="number"
          min={0}
          value={delayMs}
          onChange={(e) => setDelayMs(e.target.value)}
          placeholder="e.g. 2000"
          className="w-full sm:w-48 rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {applied && <span className="text-xs text-status-success">Applied</span>}
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-1.5 rounded-md text-sm font-medium bg-accent text-white cursor-pointer"
        >
          Apply
        </button>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Settings</h1>
      <ProfileSection />
      <ChangePasswordSection />
      <AppearanceSection />
      <NotificationsSection />
      <DeveloperSection />
    </div>
  );
}