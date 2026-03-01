"use client";

import Link from "next/link";
import { ArrowRight, FileText, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Project } from "@/types";
import { Separator } from "../ui/separator";

interface ProjectCardProps {
    project: Project;
}

const AVATAR_COLORS = [
    { bg: "bg-violet-500/15 border-violet-500/25", text: "text-violet-400" },
    { bg: "bg-blue-500/15 border-blue-500/25", text: "text-blue-400" },
    { bg: "bg-emerald-500/15 border-emerald-500/25", text: "text-emerald-400" },
    { bg: "bg-amber-500/15 border-amber-500/25", text: "text-amber-400" },
    { bg: "bg-rose-500/15 border-rose-500/25", text: "text-rose-400" },
    { bg: "bg-cyan-500/15 border-cyan-500/25", text: "text-cyan-400" },
] as const;

function projectColor(name: string) {
    const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function ProjectCard({ project }: ProjectCardProps) {
    const color = projectColor(project.name);

    return (
        <Link href={`/dashboard/projects/${project.id}`} className="group block h-full">
            <Card className="relative h-full transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 bg-card">
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-primary/2 pointer-events-none" />

                <CardContent className="flex flex-col justify-between gap-4 h-full">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                        <div
                            className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-bold",
                                color.bg,
                                color.text
                            )}
                        >
                            {project.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {project.name}
                            </h3>
                            {project.description ? (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                                    {project.description}
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground/40 mt-0.5 italic">
                                    No description
                                </p>
                            )}
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>

                    <Separator />

                    {/* Footer */}
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
                        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground/50">
                            <Clock className="h-3 w-3" />
                            <span>
                                {formatDistanceToNow(new Date(project.updatedAt), {
                                    addSuffix: false,
                                })}{" "}
                                ago
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
