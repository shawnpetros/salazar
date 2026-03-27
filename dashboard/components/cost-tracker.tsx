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
      <Card>
        <CardHeader>
          <CardTitle>Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No cost data</p>
        </CardContent>
      </Card>
    );
  }

  const agents = [
    { label: "Planner", cost: data.byAgent.planner },
    { label: "Generator", cost: data.byAgent.generator },
    { label: "Evaluator", cost: data.byAgent.evaluator },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold font-[family-name:var(--font-geist-mono)] tabular-nums text-foreground">
              {formatCost(data.estimatedCost)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Input tokens</span>
              <span className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums">
                {formatTokens(data.inputTokens)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Output tokens</span>
              <span className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums">
                {formatTokens(data.outputTokens)}
              </span>
            </div>
          </div>

          <div className="border-t border-border/50 pt-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">By Agent</span>
            <div className="flex flex-col gap-2 mt-2">
              {agents.map((agent) => (
                <div key={agent.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{agent.label}</span>
                  <span className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {formatCost(agent.cost)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
