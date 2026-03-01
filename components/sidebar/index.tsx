"use client"

import { User } from "next-auth"
import { Project } from "@/types"
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent } from "../ui/sidebar"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "../ui/dropdown-menu"
import { Button, buttonVariants } from "../ui/button"
import { signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { cn, getActiveChatIdFromPath, getActiveProjectIdFromPath } from "@/lib/utils"
import { File, Plus, Settings } from "lucide-react"
import Link from "next/link"
import { useChats, useCreateChat } from "@/hooks/use-chats"
import { toast } from "../ui/use-toast"
import { Skeleton } from "../ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import ProjectSelector from "./ProjectSelector"
import UserButton from "./UserButton"
import RecentChats from "./RecentChats"
import NoProjectSelected from "./NoProjectSelected"

interface DashboardSidebarProps {
    user: User
    projects: Project[]
}

export default function DashboardSidebar({ user, projects }: DashboardSidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const activeProjectId = getActiveProjectIdFromPath(pathname)

    const createChatMutation = useCreateChat(activeProjectId!)
    const handleCreateChat = async () => {
        try {
            const chat = await createChatMutation.mutateAsync({ name: "New chat" })
            router.push(`/dashboard/projects/${activeProjectId}/chat/${chat.id}`)
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to create chat",
                variant: "destructive",
            })
        }
    }

    const { data: chats, isLoading } = useChats(activeProjectId!)

    return (
        <Sidebar>
            <SidebarHeader className="border-b border-border">
                <ProjectSelector projects={projects} pathname={pathname} />
            </SidebarHeader>
            <SidebarContent>
                {activeProjectId ? (
                    <>
                        <SidebarGroup>
                            <SidebarGroupContent>
                                <Link href={`/dashboard/projects/${activeProjectId}/settings`}>
                                    <Button variant={"ghost"} className="w-full justify-start gap-2">
                                        <Settings className="h-4 w-4 text-muted-foreground" />
                                        <span>Settings</span>
                                    </Button>
                                </Link>
                                <Link href={`/dashboard/projects/${activeProjectId}/documents`}>
                                    <Button variant={"ghost"} className="w-full justify-start gap-2">
                                        <File className="h-4 w-4 text-muted-foreground" />
                                        <span>Documents</span>
                                    </Button>
                                </Link>
                                <Button onClick={handleCreateChat} variant={"ghost"} className="w-full justify-start gap-2">
                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                    <span>New Chat</span>
                                </Button>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <RecentChats isLoading={isLoading} chats={chats} pathname={pathname} />

                    </>
                ) : (

                    <NoProjectSelected />

                )}
            </SidebarContent>
            <SidebarFooter>
                <UserButton user={user} />
            </SidebarFooter>
        </Sidebar >
    )
}