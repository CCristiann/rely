"use client";

import { useEffect } from "react";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useChat } from "@/hooks/use-chats";
import { useChatStream } from "@/hooks/use-chat-stream";
import { User } from "next-auth";

interface ChatPanelProps {
  projectId: string;
  chatId: string;
  user: User;
}

export function ChatPanel({ projectId, chatId, user }: ChatPanelProps) {
  const {
    messages,
    isLoading: streamLoading,
    streamingContent,
    sendMessage,
    stopStreaming,
    loadMessages,
  } = useChatStream(projectId);

  const { data: chatData } = useChat(projectId, chatId);

  // Sync messages with chatData — clears on chat switch, populates when data arrives
  useEffect(() => {
    loadMessages(chatData?.messages ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatData]);

  async function handleSend(content: string) {
    await sendMessage(content, chatId);
  }

  const chatName = chatData?.name;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full w-full overflow-hidden">
      {/* Chat name header */}
      <div className="shrink-0 flex items-center h-11 px-5 bg-background z-10">
        {chatName ? (
          <p className="text-sm font-medium text-foreground truncate">
            {chatName}
          </p>
        ) : (
          <div className="h-3 w-36 rounded bg-muted animate-pulse" />
        )}
      </div>

      {/* Messages with gradient fade overlays */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />

        <ChatMessages
          messages={messages}
          isLoading={streamLoading}
          streamingContent={streamingContent}
          user={user}
        />

        <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
      </div>

      {/* Bottom input */}
      <div className="shrink-0 px-4 pb-4 pt-2 bg-background z-10">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={handleSend}
            isLoading={streamLoading}
            onStop={stopStreaming}
          />
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            AI responses are grounded in your uploaded documents.
          </p>
        </div>
      </div>
    </div>
  );
}
