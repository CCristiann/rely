"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrainCircuit, Menu, Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface MobileNavProps {
  projects: Project[];
}

export function MobileNav({ projects }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
        <SheetHeader className="px-4 pt-4 pb-3">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 border border-primary/30">
              <BrainCircuit className="w-4 h-4 text-primary" />
            </div>
            Rely<span className="text-primary">RAG</span>
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-3">
          <Link
            href="/dashboard/projects/create"
            onClick={() => setOpen(false)}
          >
            <Button size="sm" className="w-full gap-2">
              <Plus className="h-3.5 w-3.5" />
              New Project
            </Button>
          </Link>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            {projects.map((project) => {
              const active = pathname.startsWith(`/dashboard/projects/${project.id}`);
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  <span className="truncate font-medium">{project.name}</span>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
