"use client";

import Link from "next/link";
import { ArrowRight, FileText, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { truncate } from "@/lib/utils";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/dashboard/projects/${project.id}`} className="group block">
      <Card className="relative h-full transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 bg-card">
        {/* Purple glow on hover */}
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-primary/3 pointer-events-none" />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {truncate(project.description, 80)}
                </p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>
                {project._count?.documents ?? 0}{" "}
                {project._count?.documents === 1 ? "doc" : "docs"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>
                {project._count?.chats ?? 0}{" "}
                {project._count?.chats === 1 ? "chat" : "chats"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
