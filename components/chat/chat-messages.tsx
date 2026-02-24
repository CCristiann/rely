"use client";

import { useEffect, useRef } from "react";
import { ChatMessage, ThinkingIndicator } from "./chat-message";
import type { Message } from "@/types";
import { User } from "next-auth"

interface ChatMessagesProps {
  messages: Array<Message | { role: "user" | "assistant"; content: string; id: string }>;
  isLoading?: boolean;
  streamingContent?: string;
  user: User;
}

export function ChatMessages({ messages, isLoading, streamingContent, user }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingContent, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center text-center justify-center flex-1 gap-4 px-6">
        <h3 className="text-5xl font-semibold text-foreground font-[--font-eb-garamond] mb-1">
          Welcome back, {user.name?.split(" ")[0]}!
        </h3>
        <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
          Ask questions about your uploaded documents and get AI-powered answers.
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="max-w-3xl mx-auto py-4 w-full">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message as Message} />
        ))}

        {/* Streaming assistant response */}
        {streamingContent && (
          <ChatMessage
            message={{
              id: "streaming",
              role: "assistant",
              content: streamingContent,
              chatId: "",
              createdAt: new Date(),
            }}
            isStreaming
          />
        )}

        {/* Thinking indicator */}
        {isLoading && !streamingContent && <ThinkingIndicator />}
      </div>
    </div>
  );
}
