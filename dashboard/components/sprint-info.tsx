"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SprintData } from "@/lib/types";

const phaseDots: Record<string, string> = {
  plan: "bg-[#cba6f7]",
  generate: "bg-[#89b4fa]",
  evaluate: "bg-[#f9e2af]",
  validate: "bg-[#a6e3a1]",
};

export function SprintInfo({ data }: { data: SprintData | null }) {
  if (!data) {
    return (
      <Card className="border-dashed border-border/30">
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground/70">Sprint</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground/70">No sprint data</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground/70">Sprint</CardTitle>
          <span className="text-xs font-mono text-muted-foreground/80 bg-muted/30 px-2 py-0.5 rounded">
            #{data.iteration}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${phaseDots[data.phase] ?? "bg-zinc-400"}`} />
            <span className="text-sm font-medium capitalize">{data.phase}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/80">Feature</span>
            <p className="text-sm font-medium mt-0.5 leading-snug">{data.featureName}</p>
          </div>
          {data.goal && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/80">Goal</span>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{data.goal}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
