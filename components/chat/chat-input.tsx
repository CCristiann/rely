"use client";

import { useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  onStop?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, onStop, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const msg = value.trim();
    if (!msg || isLoading || disabled) return;
    onSend(msg);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    // Auto-resize
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }

  return (
    <div className="relative flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50 transition-colors">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about your documents… (Enter to send)"
        disabled={disabled}
        rows={1}
        className={cn(
          "flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          "max-h-40 min-h-[36px]"
        )}
        style={{ height: "36px" }}
      />

      <div className="shrink-0">
        {isLoading ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onStop}
            className="text-muted-foreground hover:text-destructive h-8 w-8"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className="h-8 w-8"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
