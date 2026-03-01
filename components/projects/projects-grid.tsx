"use client";

import { Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "./project-card";
import { EmptyState } from "@/components/common/empty-state";
import type { Project } from "@/types";

interface ProjectsGridProps {
  projects: Project[];
  isLoading?: boolean;
}

export function ProjectsGrid({ projects, isLoading }: ProjectsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
            {/* Header skeleton */}
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-md shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
            {/* Footer skeleton */}
            <div className="flex items-center gap-3 pt-1 border-t border-border/50">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <EmptyState
          icon={Layers}
          title="No projects yet"
          description="Create your first project to start uploading documents and chatting with your data."
          action={{ label: "Create project", href: "/dashboard/projects/create" }}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
