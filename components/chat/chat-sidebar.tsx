"use client";

import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";
import type { Chat } from "@/types";

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  isLoading?: boolean;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({
  chats,
  activeChatId,
  isLoading,
  onSelectChat,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <div className="flex flex-col h-full w-[200px] border-r border-border bg-sidebar shrink-0">
      <div className="p-3 border-b border-border shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onNewChat}
          className="w-full gap-2 border-dashed hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          New chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No chats yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "group w-full text-left rounded-md px-2.5 py-2 transition-all duration-150",
                  activeChatId === chat.id
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 mt-0.5",
                      activeChatId === chat.id ? "text-primary" : ""
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {truncate(chat.name, 22)}
                    </p>
                    <p className="text-[10px] opacity-60 mt-0.5">
                      {formatRelativeTime(chat.updatedAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
