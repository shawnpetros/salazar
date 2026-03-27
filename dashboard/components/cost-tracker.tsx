"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CostData } from "@/lib/types";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function CostTracker({ data }: { data: CostData | null }) {
  if (!data) {
    return (
      <Card className="border-dashed border-border/30">
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground/70">Cost</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground/40">No cost data</p></CardContent>
      </Card>
    );
  }

  const agents = [
    { label: "Plan", cost: data.byAgent.planner, color: "bg-violet-400" },
    { label: "Gen", cost: data.byAgent.generator, color: "bg-sky-400" },
    { label: "Eval", cost: data.byAgent.evaluator, color: "bg-amber-400" },
  ];

  const totalCost = data.byAgent.planner + data.byAgent.generator + data.byAgent.evaluator;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground/70">Cost</CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground/40 font-mono">{formatTokens(data.inputTokens)} in</span>
            <span className="text-muted-foreground/20">/</span>
            <span className="text-[11px] text-muted-foreground/40 font-mono">{formatTokens(data.outputTokens)} out</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <span className="text-3xl font-bold font-mono tabular-nums">
            {formatCost(data.estimatedCost)}
          </span>

          {/* Agent cost breakdown as mini bar */}
          {totalCost > 0 && (
            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/30">
              {agents.map((a) => {
                const width = totalCost > 0 ? (a.cost / totalCost) * 100 : 0;
                return width > 0 ? (
                  <div key={a.label} className={`${a.color} transition-all`} style={{ width: `${width}%` }} />
                ) : null;
              })}
            </div>
          )}

          <div className="flex items-center gap-4">
            {agents.map((a) => (
              <div key={a.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${a.color}`} />
                <span className="text-[11px] text-muted-foreground/50">{a.label}</span>
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground/70">{formatCost(a.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
