"use client";

import { useEffect, useState } from "react";
import { Task, Project } from "@/types";
import { TaskStatusChart, ProjectProgressChart } from "@/components/dashboard/AnalyticsCharts";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchTasks } from "@/lib/api/tasks";
import { fetchProjects } from "@/lib/api/projects";

export default function AnalyticsPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    fetchTasks().then(setTasks);
    fetchProjects().then(setProjects);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Analytics</h1>
        <p className="text-sm text-ink-muted mt-1">Task and project trends at a glance</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tasks ? <TaskStatusChart tasks={tasks} /> : <Skeleton className="h-[300px] rounded-card" />}
        {projects ? <ProjectProgressChart projects={projects} /> : <Skeleton className="h-[300px] rounded-card" />}
      </div>
    </div>
  );
}