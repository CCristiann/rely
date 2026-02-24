"use client"

import { User } from "next-auth"
import { Project } from "@/types"
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup } from "../ui/sidebar"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "../ui/dropdown-menu"
import { Button, buttonVariants } from "../ui/button"
import { signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { cn, getActiveChatIdFromPath, getActiveProjectIdFromPath } from "@/lib/utils"
import { ChevronsUpDown, LogOut, Plus, Settings } from "lucide-react"
import Link from "next/link"
import { useChats, useCreateChat } from "@/hooks/use-chats"
import { toast } from "../ui/use-toast"
import { Skeleton } from "../ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"

interface DashboardSidebarProps {
  user: User
  projects: Project[]
}

export default function DashboardSidebar({ user, projects }: DashboardSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const activeProjectId = getActiveProjectIdFromPath(pathname)
  const activeProject = projects.find((p) => p.id === activeProjectId)

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

  const activeChatId = getActiveChatIdFromPath(pathname)

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", className: "w-full" })}>
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
      </SidebarHeader>
      <SidebarContent>
        {activeProjectId ? (
          <>
            <SidebarGroup>
              <Button onClick={handleCreateChat} variant={"ghost"} className="w-full justify-start gap-2">
                <div className="bg-accent rounded-full p-0.5">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
                <span>New Chat</span>
              </Button>
            </SidebarGroup>
            <SidebarGroup className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Recents</h3>
              <div className="flex flex-col gap-y-2">
                {isLoading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full rounded-md" />
                    ))}
                  </>
                ) : (
                  chats?.map((chat) => (
                    <Link key={chat.id} href={`/dashboard/projects/${activeProjectId}/chat/${chat.id}`} className={cn(buttonVariants({ variant: "ghost", className: "w-full justify-start text-sm font-normal" }), "text-start truncate", chat.id === activeChatId && "bg-primary/20 border border-primary/50 hover:!bg-primary/20")}>
                      {chat.name}
                    </Link>
                  ))
                )}
              </div>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup className="h-full">
            <div className="w-full h-full flex flex-col gap-y-1 items-center justify-center text-center">
              <p className="text-sm font-medium">No project selected</p>
              <p className="text-xs text-muted-foreground">Select a project to start a chat</p>
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", className: "w-full" }), "py-5")}>
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarImage src={user.image!} />
                  <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{user.name}</span>
              </div>
              <ChevronsUpDown className="h-4 w-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="space-y-2">
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>

            <div className="flex flex-col gap-y-1">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <button onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}