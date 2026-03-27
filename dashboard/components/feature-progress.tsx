"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FeaturesData } from "@/lib/types";

export function FeatureProgress({ data }: { data: FeaturesData | null }) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No feature data</p>
        </CardContent>
      </Card>
    );
  }

  const pct = data.total > 0 ? Math.round((data.passing / data.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Features</span>
          <span className="text-sm font-[family-name:var(--font-geist-mono)] text-muted-foreground tabular-nums">
            {data.passing}/{data.total} ({pct}%)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Progress value={pct} />

        <ScrollArea className="h-48">
          <div className="flex flex-col gap-1.5">
            {data.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 text-sm py-1 px-1 rounded hover:bg-muted/50"
              >
                {item.passes ? (
                  <svg className="h-4 w-4 shrink-0 text-emerald-400" viewBox="0 0 16 16" fill="none">
                    <path d="M13.25 4.75L6 12 2.75 8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                )}
                <span className={item.passes ? "text-foreground" : "text-muted-foreground"}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
