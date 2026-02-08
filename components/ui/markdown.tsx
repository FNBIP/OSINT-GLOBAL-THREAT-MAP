"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn("prose prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          h1: ({ children }) => (
            <h1 className="mb-4 mt-6 text-xl font-bold text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-5 text-lg font-bold text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-base font-bold text-foreground">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-2 mt-3 text-base font-semibold text-foreground">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="mb-1 mt-2 text-sm font-semibold text-foreground">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="mb-1 mt-2 text-sm font-medium text-foreground">{children}</h6>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {children}
            </code>
          ),
          ul: ({ children }) => (
            <ul className="my-3 ml-4 list-disc space-y-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 ml-4 list-decimal space-y-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
