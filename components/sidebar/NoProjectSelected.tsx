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
