"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Project, TeamMember } from "@/types";
import { fetchProjects, createProject, updateProject, deleteProject } from "@/lib/api/projects";
import { fetchTeamMembers } from "@/lib/api/team";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { ProjectCardSkeleton } from "@/components/dashboard/ProjectCardSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectFormModal, ProjectFormValues } from "@/components/dashboard/ProjectFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FolderOpen, Plus } from "lucide-react";

function ProjectsContent() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");

  useEffect(() => {
    fetchProjects().then(setProjects);
    fetchTeamMembers().then(setMembers);
  }, []);

  const filtered = projects
    ? filter === "active"
      ? projects.filter((p) => p.status !== "completed")
      : projects
    : null;

  function openCreateModal() {
    setEditingProject(null);
    setModalOpen(true);
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
    setModalOpen(true);
  }

  async function handleSubmit(values: ProjectFormValues) {
    setSaving(true);
    try {
      if (editingProject) {
        const updated = await updateProject(editingProject.id, values);
        setProjects((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? null);
      } else {
        const created = await createProject({ ...values, progress: 0 });
        setProjects((prev) => (prev ? [...prev, created] : [created]));
      }
      setModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteProject() {
    if (!projectToDelete) return;
    const projectId = projectToDelete.id;
    const previous = projects;
    setProjects((prev) => prev?.filter((p) => p.id !== projectId) ?? null);
    setProjectToDelete(null);
    try {
      await deleteProject(projectId);
    } catch (err) {
      setProjects(previous);
      alert(err instanceof Error ? err.message : "Failed to delete project");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Projects</h1>
          {filter === "active" && (
            <p className="text-sm text-ink-muted mt-1">Showing active projects only</p>
          )}
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-accent text-white cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered === null
          ? Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)
          : filtered.length > 0
          ? filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={openEditModal}
                onDelete={setProjectToDelete}
              />
            ))
          : (
            <div className="col-span-full">
              <EmptyState
                icon={FolderOpen}
                title="No projects found"
                description="Nothing matches this filter right now."
              />
            </div>
          )}
      </div>

      <ProjectFormModal
        key={modalOpen ? (editingProject?.id ?? "new") : "closed"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        members={members ?? []}
        onMemberCreated={(m) => setMembers((prev) => (prev ? [...prev, m] : [m]))}
        initialProject={editingProject}
        submitting={saving}
      />

      <ConfirmDialog
        open={projectToDelete !== null}
        title="Delete project?"
        message={
          projectToDelete
            ? `"${projectToDelete.name}" and all of its tasks will be permanently removed.`
            : ""
        }
        confirmLabel="Yes, delete"
        cancelLabel="No"
        onConfirm={confirmDeleteProject}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsContent />
    </Suspense>
  );
}