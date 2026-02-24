"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/common/loading-spinner";
import { useChats, useCreateChat } from "@/hooks/use-chats";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { data: chats, isLoading } = useChats(id);
  const { mutateAsync: createChat } = useCreateChat(id);

  // Auto-redirect to first chat if available
  useEffect(() => {
    if (!isLoading && chats && chats.length > 0) {
      router.replace(`/dashboard/projects/${id}/chat/${chats[0].id}`);
    }
  }, [chats, isLoading, id, router]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  // Empty state — no chats yet
  async function handleNewChat() {
    const chat = await createChat({ name: "New Chat" });
    router.push(`/dashboard/projects/${id}/chat/${chat.id}`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start a conversation with your uploaded documents
        </p>
      </div>
      <Button size="sm" onClick={handleNewChat} className="gap-2">
        <Plus className="h-3.5 w-3.5" />
        New chat
      </Button>
    </div>
  );
}
