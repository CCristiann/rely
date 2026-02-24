import { Project } from "@prisma/client";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "../ui/dropdown-menu"
import { buttonVariants } from "../ui/button"
import { ChevronsUpDown } from "lucide-react"
import Link from "next/link"
import { getActiveProjectIdFromPath } from "@/lib/utils";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";

export default function ProjectSelector({ projects, pathname }: { projects: Project[], pathname: string }) {
    const activeProjectId = getActiveProjectIdFromPath(pathname)
    const activeProject = projects.find((p) => p.id === activeProjectId)
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            {activeProject ? (
                                <div className="flex w-full items-center justify-between gap-2">
                                    <span className="text-sm font-bold">{activeProject?.name}</span>
                                    <ChevronsUpDown className="h-4 w-4" />
                                </div>
                            ) : (
                                <div className="flex w-full items-center justify-between gap-2">
                                    Select a project
                                    <ChevronsUpDown className="h-4 w-4" />
                                </div>
                            )}
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Projects</DropdownMenuLabel>
                        {projects.filter((p) => p.id !== activeProjectId).map((p) => (
                            <DropdownMenuItem key={p.id} asChild>
                                <Link href={`/dashboard/projects/${p.id}`}>
                                    {p.name}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
} 