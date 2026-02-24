"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FormattedResponse } from "@/components/common/formatted-response";
import type { Message } from "@/types";

// ── Thinking indicator (Claude-style) ────────────────────────────────────────

const THINKING_PHRASES = [
  "Thinking…",
  "Searching your documents…",
  "Analyzing context…",
  "Formulating a response…",
  "Reading knowledge base…",
  "Connecting the dots…",
];

export function ThinkingIndicator() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const timeout = setTimeout(() => {
        setIndex((i) => (i + 1) % THINKING_PHRASES.length);
        setVisible(true);
      }, 280);
      return () => clearTimeout(timeout);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5">
      {/* Bouncing dots */}
      <div className="flex items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
            style={{
              animation: "bounce-dot 1.1s ease-in-out infinite",
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
      {/* Rotating phrase */}
      <span
        className="text-sm text-muted-foreground select-none"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 280ms ease",
        }}
      >
        {THINKING_PHRASES[index]}
      </span>
    </div>
  );
}

// ── Chat message ──────────────────────────────────────────────────────────────

interface ChatMessageProps {
  message:
    | Message
    | {
        role: "user" | "assistant";
        content: string;
        id?: string;
        createdAt?: Date;
        chatId?: string;
      };
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1.5">
        <div
          className={cn(
            "max-w-[72%] rounded-2xl rounded-br-md px-4 py-2.5",
            "bg-muted text-foreground"
          )}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant — no border, no background, clean prose
  return (
    <div className="px-4 py-2">
      <FormattedResponse content={message.content} />
      {isStreaming && (
        <span className="inline-block w-[2px] h-4 bg-foreground/50 ml-0.5 align-middle animate-pulse" />
      )}
    </div>
  );
}

// Kept for backward-compat
export function ChatMessageSkeleton() {
  return <ThinkingIndicator />;
}
