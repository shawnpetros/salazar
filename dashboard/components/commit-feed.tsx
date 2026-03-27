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
      <Card>
        <CardHeader>
          <CardTitle>Commits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No commits yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Commits</span>
          <span className="text-xs text-muted-foreground font-normal">{data.length} recent</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-56">
          <div className="flex flex-col gap-2">
            {data.map((commit, i) => (
              <div
                key={`${commit.sha}-${i}`}
                className="flex items-start gap-3 py-2 px-1 rounded hover:bg-muted/50"
              >
                <code className="text-xs font-[family-name:var(--font-geist-mono)] text-emerald-400 shrink-0 pt-0.5">
                  {commit.sha.slice(0, 7)}
                </code>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{commit.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {commit.filesChanged} file{commit.filesChanged !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(commit.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
