"use client";

import ReactMarkdown from "react-markdown";
import type { SpecData } from "@/lib/types";

export function SpecCard({ data }: { data: SpecData | null }) {
  if (!data) return null;

  return (
    <div className="pb-3 mb-1 border-b border-[#313244]/60">
      <h2 className="text-lg font-bold text-[#cba6f7] leading-tight">
        {data.name}
      </h2>
      {data.description && (
        <div className="mt-2 max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-[#45475a] scrollbar-track-transparent">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="text-sm text-[#9399b2] leading-relaxed my-1">{children}</p>,
              strong: ({ children }) => <span className="text-[#cdd6f4] font-semibold">{children}</span>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#89b4fa] hover:underline">
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="text-[#f5c2e7] text-xs bg-[#313244] px-1.5 py-0.5 rounded">{children}</code>
              ),
              ul: ({ children }) => <ul className="text-sm text-[#9399b2] my-1 pl-4 list-disc">{children}</ul>,
              li: ({ children }) => <li className="text-sm text-[#9399b2] my-0.5">{children}</li>,
            }}
          >
            {data.description}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
