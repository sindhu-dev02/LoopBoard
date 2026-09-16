"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderKanban, ListChecks, Users } from "lucide-react";
import { Project, Task, TeamMember } from "@/types";
import { cn } from "@/lib/utils";
import { fetchProjects } from "@/lib/api/projects";
import { fetchTasks } from "@/lib/api/tasks";
import { fetchTeamMembers } from "@/lib/api/team";

type PaletteItem = {
  id: string;
  label: string;
  sublabel: string;
  icon: typeof FolderKanban;
  href: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [close]);

  useEffect(() => {
    if (open && !loaded) {
      Promise.all([fetchProjects(), fetchTasks(), fetchTeamMembers()]).then(
        ([p, t, m]) => {
          setProjects(p);
          setTasks(t);
          setMembers(m);
          setLoaded(true);
        }
      );
    }
  }, [open, loaded]);

  const items: PaletteItem[] = [
    ...projects.map((p) => ({
      id: `project-${p.id}`,
      label: p.name,
      sublabel: "Project",
      icon: FolderKanban,
      href: `/projects?filter=${p.status}`,
    })),
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      label: t.title,
      sublabel: "Task",
      icon: ListChecks,
      href: `/tasks?status=${t.status}`,
    })),
    ...members.map((m) => ({
      id: `member-${m.id}`,
      label: m.name,
      sublabel: m.role,
      icon: Users,
      href: `/team`,
    })),
  ];

  const filtered = query
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items.slice(0, 8);

  function handleSelect(item: PaletteItem) {
    router.push(item.href);
    close();
  }

  function handleKeyNav(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      handleSelect(filtered[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40"
      onClick={close}
    >
      <div
        className="w-full max-w-lg bg-surface-raised border border-surface-border rounded-card shadow-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border">
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyNav}
            placeholder="Search projects, tasks, people..."
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-faint"
          />
          <kbd className="hidden sm:inline text-[10px] text-ink-faint border border-surface-border rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {!loaded ? (
            <div className="px-4 py-6 text-sm text-ink-muted text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-sm text-ink-muted text-center">No results</div>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer",
                    i === activeIndex ? "bg-accent/10" : "hover:bg-surface"
                  )}
                >
                  <Icon className="w-4 h-4 text-ink-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">{item.label}</p>
                    <p className="text-xs text-ink-muted">{item.sublabel}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}