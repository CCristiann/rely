"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

interface FormattedResponseProps {
  content: string;
  className?: string;
}

export function FormattedResponse({ content, className }: FormattedResponseProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none wrap-break-word", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
