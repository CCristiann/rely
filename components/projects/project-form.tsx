"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/loading-spinner";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(64, "Max 64 characters"),
  description: z.string().max(256, "Max 256 characters").optional(),
});

export type ProjectFormValues = z.infer<typeof schema>;

interface ProjectFormProps {
  onSubmit: (data: ProjectFormValues) => Promise<void>;
  defaultValues?: Partial<ProjectFormValues>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function ProjectForm({
  onSubmit,
  defaultValues,
  submitLabel = "Create project",
  isLoading,
}: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", ...defaultValues },
  });

  const loading = isLoading ?? isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Project name</Label>
        <Input
          id="name"
          placeholder="e.g. Company Docs, Research Papers…"
          {...register("name")}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="What kind of documents will you upload?"
          rows={3}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <LoadingSpinner size="sm" />}
        {submitLabel}
      </Button>
    </form>
  );
}
