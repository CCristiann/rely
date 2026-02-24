"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

// Extend the default sanitize schema to allow KaTeX-generated SVG/MathML
// and highlight.js class attributes while still blocking scripts and event handlers.
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    // SVG subset used by KaTeX
    "svg", "path", "g", "defs", "clipPath", "use",
    // MathML subset used by KaTeX
    "math", "mrow", "mi", "mn", "mo", "ms", "mtext",
    "msup", "msub", "msubsup", "mfrac", "msqrt", "mroot",
    "munder", "mover", "munderover", "mspace", "mpadded",
    "annotation", "semantics",
  ],
  attributes: {
    ...defaultSchema.attributes,
    svg: ["xmlns", "viewBox", "width", "height", "aria-hidden", "focusable", "className"],
    path: ["d", "className"],
    math: ["xmlns"],
    use: ["href", "xlinkHref", "className"],
    g: ["className"],
  },
};

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy code"
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

interface FormattedResponseProps {
  content: string;
  className?: string;
}

export function FormattedResponse({ content, className }: FormattedResponseProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        // Pipeline: KaTeX → highlight → raw → sanitize
        // rehypeHighlight runs before sanitize so its class attributes are preserved.
        rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
