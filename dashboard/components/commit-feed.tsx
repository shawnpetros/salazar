"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CommitEntry } from "@/lib/types";

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function CommitFeed({ data }: { data: CommitEntry[] | null }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-dashed border-border/30 h-full">
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground/70">Commits</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground/40">No commits yet</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground/70">Commits</CardTitle>
          <span className="text-[11px] font-mono text-muted-foreground/40">{data.length} recent</span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-56">
          <div className="flex flex-col">
            {data.map((commit, i) => (
              <div
                key={`${commit.sha}-${i}`}
                className="flex items-start gap-3 py-2.5 px-2 rounded-md hover:bg-muted/20 transition-colors border-b border-border/20 last:border-0"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-1.5 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary/40" />
                  {i < data.length - 1 && <div className="w-px flex-1 bg-border/30 mt-1" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded">
                      {commit.sha.slice(0, 7)}
                    </code>
                    <span className="text-[11px] text-muted-foreground/40">
                      {relativeTime(commit.timestamp)}
                    </span>
                  </div>
                  <p className="text-[13px] mt-1 leading-snug text-foreground/80 truncate">{commit.message}</p>
                  <span className="text-[11px] text-muted-foreground/30 mt-0.5">
                    {commit.filesChanged} file{commit.filesChanged !== 1 ? "s" : ""} changed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
