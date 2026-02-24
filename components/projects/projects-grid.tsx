"use client";

import Link from "next/link";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
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
