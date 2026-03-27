"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FeaturesData } from "@/lib/types";

export function FeatureProgress({ data }: { data: FeaturesData | null }) {
  if (!data) {
    return (
      <Card className="border-dashed border-border/30 h-full">
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground/70">Features</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground/40">No feature data</p></CardContent>
      </Card>
    );
  }

  const pct = data.total > 0 ? Math.round((data.passing / data.total) * 100) : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground/70">Features</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-foreground">{data.passing}</span>
            <span className="text-sm text-muted-foreground/50 font-mono">/ {data.total}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={pct} className="flex-1 h-1.5 [&_[data-slot=progress-indicator]]:bg-emerald-500" />
          <span className="text-xs font-mono tabular-nums text-muted-foreground w-10 text-right">{pct}%</span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-56">
          <div className="flex flex-col gap-0.5">
            {data.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 text-[13px] py-1.5 px-2 rounded-md transition-colors ${item.passes ? "bg-emerald-500/5" : "hover:bg-muted/30"}`}
              >
                {item.passes ? (
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <svg className="h-2.5 w-2.5 text-emerald-400" viewBox="0 0 16 16" fill="none">
                      <path d="M13.25 4.75L6 12 2.75 8.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <div className="h-4 w-4 rounded-full border border-border/50 shrink-0" />
                )}
                <span className={item.passes ? "text-foreground/90" : "text-muted-foreground/60"}>
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
