"use client";

import { useState, useRef, useCallback } from "react";
import type { Message } from "@/types";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  chatId: string;
  createdAt: Date;
}

export function useChatStream(projectId: string) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  function loadMessages(msgs: Message[]) {
    setMessages(
      msgs.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        chatId: m.chatId,
        createdAt: new Date(m.createdAt),
      }))
    );
  }

  const sendMessage = useCallback(
    async (content: string, chatId: string) => {
      if (isLoading) return;

      const userMsg: LocalMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        chatId,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingContent("");

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`/api/projects/${projectId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: content,
            chatId,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Parse Vercel AI SDK data stream format
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("0:")) {
              // Text delta
              try {
                const text = JSON.parse(line.slice(2));
                accumulated += text;
                setStreamingContent(accumulated);
              } catch {}
            }
          }
        }

        // Add final message
        const assistantMsg: LocalMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: accumulated,
          chatId,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingContent("");
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // User intentionally stopped the stream — no UI feedback needed
        } else {
          console.error("[useChatStream] Stream error:", err);
          const errorMsg: LocalMessage = {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            chatId,
            createdAt: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          setStreamingContent("");
        }
      } finally {
        setIsLoading(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
    },
    [isLoading, messages, projectId]
  );

  function stopStreaming() {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setStreamingContent("");
  }

  return {
    activeChatId,
    setActiveChatId,
    messages,
    isLoading,
    streamingContent,
    sendMessage,
    stopStreaming,
    loadMessages,
  };
}
