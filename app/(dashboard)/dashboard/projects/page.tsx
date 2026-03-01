"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ProjectsGrid } from "@/components/projects/projects-grid";
import { useProjects } from "@/hooks/use-projects";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <PageHeader
            title="Projects"
            description="Your knowledge bases. Each project has its own document set and chat history."
          >
            <Link href="/dashboard/projects/create" className={buttonVariants({ size: "lg", className: "gap-2" })}>
              <Plus className="h-3.5 w-3.5" />
              New project
            </Link>
          </PageHeader>

          <ProjectsGrid projects={projects ?? []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
