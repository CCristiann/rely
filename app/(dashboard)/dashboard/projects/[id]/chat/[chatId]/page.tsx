import { use } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string; chatId: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { id, chatId } = await params;
  const session = await auth();
  if (!session?.user) {
    return redirect("/login");
  }
  return <ChatPanel projectId={id} chatId={chatId} user={session?.user} />;
}
