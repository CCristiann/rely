"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectForm, type ProjectFormValues } from "@/components/projects/project-form";
import { useCreateProject } from "@/hooks/use-projects";
import { toast } from "@/components/ui/use-toast";

export default function CreateProjectPage() {
  const router = useRouter();
  const { mutateAsync: createProject } = useCreateProject();

  async function handleSubmit(data: ProjectFormValues) {
    const project = await createProject(data);
    toast({ title: "Project created!", description: `"${project.name}" is ready.`, variant: "default" });
    router.push(`/dashboard/projects/${project.id}`);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-6">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm" className="gap-2 mb-6 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to projects
            </Button>
          </Link>

          <div className="flex flex-col gap-y-6">
            <div className="flex flex-col">
              <h3 className="font-[--font-eb-gamond] text-4xl">Create a Project</h3>
              <p className="text-muted-foreground">Projects are isolated knowledge bases. Upload documents and start chatting.</p>
            </div>
            <ProjectForm onSubmit={handleSubmit} />
          </div>


        </div>
      </div>
    </div>
  );
}
