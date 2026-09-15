"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { ActivityEvent, ActivityAction } from "@/types";
import { fetchActivity } from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";

const LAST_SEEN_KEY = "loopboard:notifications:lastSeenAt";

const ACTION_VERBS: Record<ActivityAction, string> = {
  created: "created",
  "status-changed": "updated the status of",
  completed: "completed",
  commented: "commented on",
};

function describeActivity(event: ActivityEvent) {
  return {
    title: `${event.actor} ${ACTION_VERBS[event.action]} "${event.target}"`,
    description: event.detail ?? "",
  };
}

function formatRelativeTime(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityEvent[] | null>(null);
  const lastSeenRef = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lastSeenRef.current = Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0);
    fetchActivity().then(setItems).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (open) localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const unreadCount =
    items?.filter((e) => new Date(e.timestamp).getTime() > lastSeenRef.current).length ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-raised cursor-pointer transition-colors"
      >
        <Bell className="w-5 h-5 text-ink-muted" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-danger" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-surface-raised border border-surface-border rounded-card shadow-card z-50">
          <div className="px-4 py-3 border-b border-surface-border">
            <h3 className="text-sm font-semibold text-ink">Notifications</h3>
          </div>
          {items === null ? (
            <div className="p-4 text-sm text-ink-muted">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-ink-muted">No recent activity</div>
          ) : (
            <ul>
              {items.map((event) => {
                const { title, description } = describeActivity(event);
                const unread = new Date(event.timestamp).getTime() > lastSeenRef.current;
                return (
                  <li key={event.id}>
                    <div
                      className={cn(
                        "px-4 py-3 border-b border-surface-border last:border-0",
                        unread && "bg-accent/5"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {unread && (
                          <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-accent shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink font-medium">{title}</p>
                          {description && (
                            <p className="text-xs text-ink-muted mt-0.5">{description}</p>
                          )}
                          <p className="text-xs text-ink-faint mt-1">
                            {formatRelativeTime(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}