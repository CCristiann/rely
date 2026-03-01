# Projects Page UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the `/dashboard/projects` page with polished cards and make it reachable from the sidebar.

**Architecture:** Four small, independent file edits. No new hooks, no new routes. `ProjectSelector` dropdown gains an "All projects" entry; `NoProjectSelected` gains a CTA link; `ProjectCard` gets a deterministic color avatar + `updatedAt` footer; `ProjectsGrid` skeleton is updated to match the new card shape.

**Tech Stack:** Next.js App Router, TypeScript strict, Tailwind CSS v4, shadcn/ui, Lucide React, date-fns (already in dependencies)

---

### Task 1: Sidebar — "All projects" entry in ProjectSelector dropdown

**Files:**
- Modify: `components/sidebar/ProjectSelector.tsx`

**Step 1: Read the file to understand exact current content**

Read `components/sidebar/ProjectSelector.tsx` — note current imports and dropdown structure.

**Step 2: Replace the file content with:**

```tsx
import { Project } from "@prisma/client";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { buttonVariants } from "../ui/button";
import { ChevronsUpDown, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { getActiveProjectIdFromPath } from "@/lib/utils";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";

export default function ProjectSelector({
    projects,
    pathname,
}: {
    projects: Project[];
    pathname: string;
}) {
    const activeProjectId = getActiveProjectIdFromPath(pathname);
    const activeProject = projects.find((p) => p.id === activeProjectId);

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="flex w-full items-center justify-between gap-2">
                                <span className="text-sm font-bold truncate">
                                    {activeProject ? activeProject.name : "Select a project"}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 shrink-0" />
                            </div>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Projects
                        </DropdownMenuLabel>
                        {projects
                            .filter((p) => p.id !== activeProjectId)
                            .map((p) => (
                                <DropdownMenuItem key={p.id} asChild>
                                    <Link href={`/dashboard/projects/${p.id}`}>{p.name}</Link>
                                </DropdownMenuItem>
                            ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link
                                href="/dashboard/projects"
                                className="flex items-center gap-2"
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                All projects
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
```

**Step 3: Check diagnostics — no TypeScript errors expected**

**Step 4: Commit**

```bash
git add components/sidebar/ProjectSelector.tsx
git commit -m "feat: add 'All projects' link to ProjectSelector dropdown"
```

---

### Task 2: Sidebar — CTA link in NoProjectSelected

**Files:**
- Modify: `components/sidebar/NoProjectSelected.tsx`

**Step 1: Replace the file content with:**

```tsx
import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { SidebarGroup, SidebarGroupContent } from "../ui/sidebar";

export default function NoProjectSelected() {
    return (
        <SidebarGroup className="h-full">
            <SidebarGroupContent className="w-full h-full flex flex-col gap-y-3 items-center justify-center text-center px-4">
                <p className="text-sm font-medium">No project selected</p>
                <p className="text-xs text-muted-foreground">
                    Select a project from the dropdown above or browse all projects.
                </p>
                <Link
                    href="/dashboard/projects"
                    className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "gap-2 mt-1"
                    )}
                >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    All projects
                </Link>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
```

**Step 2: Check diagnostics — no TypeScript errors expected**

**Step 3: Commit**

```bash
git add components/sidebar/NoProjectSelected.tsx
git commit -m "feat: add 'All projects' CTA to NoProjectSelected sidebar state"
```

---

### Task 3: ProjectCard redesign

**Files:**
- Modify: `components/projects/project-card.tsx`

**Step 1: Replace the file content with:**

```tsx
"use client";

import Link from "next/link";
import { ArrowRight, FileText, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Project } from "@/types";

interface ProjectCardProps {
    project: Project;
}

const AVATAR_COLORS = [
    { bg: "bg-violet-500/15 border-violet-500/25", text: "text-violet-400" },
    { bg: "bg-blue-500/15 border-blue-500/25",     text: "text-blue-400"   },
    { bg: "bg-emerald-500/15 border-emerald-500/25", text: "text-emerald-400" },
    { bg: "bg-amber-500/15 border-amber-500/25",   text: "text-amber-400"  },
    { bg: "bg-rose-500/15 border-rose-500/25",     text: "text-rose-400"   },
    { bg: "bg-cyan-500/15 border-cyan-500/25",     text: "text-cyan-400"   },
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
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-primary/[0.02] pointer-events-none" />

                <CardContent className="p-5 flex flex-col gap-4 h-full">
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

                    {/* Footer */}
                    <div className="flex items-center gap-3 pt-1 border-t border-border/50 mt-auto">
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
```

**Step 2: Check diagnostics — no errors expected. `date-fns` is already a dependency (used in document-table.tsx).**

**Step 3: Commit**

```bash
git add components/projects/project-card.tsx
git commit -m "feat: redesign ProjectCard with color avatar and updatedAt footer"
```

---

### Task 4: Update ProjectsGrid skeleton to match new card shape

**Files:**
- Modify: `components/projects/projects-grid.tsx`

**Step 1: Replace only the skeleton block (inside the `if (isLoading)` branch).** Find this exact block:

```tsx
<div key={i} className="rounded-lg border border-border bg-card p-5 space-y-3">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-3 w-full" />
  <Skeleton className="h-3 w-2/3" />
  <div className="flex gap-3 pt-2">
    <Skeleton className="h-3 w-16" />
    <Skeleton className="h-3 w-16" />
  </div>
</div>
```

Replace with:

```tsx
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
```

**Step 2: Check diagnostics — no errors expected.**

**Step 3: Commit**

```bash
git add components/projects/projects-grid.tsx
git commit -m "feat: update ProjectsGrid skeleton to match new card layout"
```
