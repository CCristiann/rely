"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useProject, useDeleteProject } from "@/hooks/use-projects";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProjectSettingsPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { data: project, isLoading } = useProject(id);
  const deleteMutation = useDeleteProject();

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Project deleted" });
      router.push("/dashboard/projects");
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">
          {isLoading ? <Skeleton className="h-8 w-48" /> : "Settings"}
        </h1>
        {project && (
          <p className="text-muted-foreground text-sm mt-1">{project.name}</p>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/40 p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-destructive">Danger Zone</h2>
          <p className="text-muted-foreground text-sm mt-1">
            These actions are permanent and cannot be undone.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border p-4">
          <div>
            <p className="font-medium text-sm">Delete this project</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Permanently deletes all documents, chats, and data associated with this project.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete project
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete{" "}
                  <strong>{project?.name ?? "this project"}</strong> along with
                  all its documents, chats, and uploaded files. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete project"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
