import Link from "next/link";
import { Skeleton } from "../ui/skeleton";
import { cn, getActiveChatIdFromPath, getActiveProjectIdFromPath } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { Chat } from "@prisma/client";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "../ui/sidebar";
import RecentChat from "./RecentChat";

interface RecentChatsProps {
    isLoading: boolean
    chats: Chat[] | undefined
    pathname: string
}

export default function RecentChats({ isLoading, chats, pathname }: RecentChatsProps) {
    const activeChatId = getActiveChatIdFromPath(pathname)

    return (
        <SidebarGroup className="space-y-2">
            <SidebarGroupLabel className="text-sm font-medium text-muted-foreground">Recents</SidebarGroupLabel>
            <SidebarGroupContent className="flex flex-col gap-y-2">
                {isLoading ? (
                    <>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-6 w-full rounded-md" />
                        ))}
                    </>
                ) : (
                    chats?.map((chat: Chat) => (
                        <RecentChat key={chat.id} chat={chat} isActive={chat.id === activeChatId} pathname={pathname} />
                    ))
                )}
            </SidebarGroupContent>
        </SidebarGroup>
    )
}