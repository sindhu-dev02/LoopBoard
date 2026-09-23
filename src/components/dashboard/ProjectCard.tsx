import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AvatarStack } from "@/components/ui/Avatar";
import { Project, ProjectStatus } from "@/types";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; badge: "success" | "warning" | "danger" | "info"; bar: "success" | "warning" | "danger" | "info" }
> = {
  "on-track": { label: "On Track", badge: "success", bar: "success" },
  "at-risk": { label: "At Risk", badge: "warning", bar: "warning" },
  delayed: { label: "Delayed", badge: "danger", bar: "danger" },
  completed: { label: "Completed", badge: "info", bar: "info" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const config = STATUS_CONFIG[project.status];

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <Card hoverable className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-ink text-sm leading-tight">{project.name}</h3>
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <button
                type="button"
                aria-label="Edit project"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(project); }}
                className="text-ink-faint hover:text-ink cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                aria-label="Delete project"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(project); }}
                className="text-ink-faint hover:text-status-danger cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <Badge status={config.badge}>{config.label}</Badge>
          </div>
        </div>
        <p className="text-xs text-ink-muted line-clamp-2">{project.description}</p>
        <ProgressBar value={project.progress} status={config.bar} />
        <div className="flex items-center justify-between pt-1">
          <AvatarStack names={project.members} />
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span>{project.completedTaskCount}/{project.taskCount} tasks</span>
            <span className="flex items-center gap-1">
              <CalendarDays size={13} />
              {formatDate(project.dueDate)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}