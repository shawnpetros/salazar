"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { EvaluatorData } from "@/lib/types";

function scoreColor(score: number): string {
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

function scoreGlow(score: number): string {
  if (score >= 7) return "drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]";
  if (score >= 5) return "drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]";
  return "drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]";
}

function barIndicator(score: number): string {
  if (score >= 7) return "[&_[data-slot=progress-indicator]]:bg-emerald-500";
  if (score >= 5) return "[&_[data-slot=progress-indicator]]:bg-amber-500";
  return "[&_[data-slot=progress-indicator]]:bg-red-500";
}

const dimensionLabels: Record<string, { label: string; icon: string }> = {
  specCompliance: { label: "Spec", icon: "S" },
  codeQuality: { label: "Quality", icon: "Q" },
  security: { label: "Security", icon: "!" },
  usability: { label: "UX", icon: "U" },
};

export function EvaluatorCard({ data }: { data: EvaluatorData | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <Card className="border-dashed border-border/30 h-full">
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground/70">Evaluator</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground/40">No evaluation data</p></CardContent>
      </Card>
    );
  }

  const dimensions = Object.entries(data.dimensionScores) as [string, number][];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground/70">Evaluator</CardTitle>
          <span className="text-xs font-mono text-muted-foreground/50">
            {Math.round(data.passRate * 100)}% pass rate
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Big score */}
          <div className="flex items-baseline gap-1.5">
            <span className={`text-5xl font-bold font-mono tabular-nums ${scoreColor(data.lastScore)} ${scoreGlow(data.lastScore)}`}>
              {data.lastScore.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground/40 font-mono">/10</span>
          </div>

          {/* Dimension bars */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {dimensions.map(([key, value]) => {
              const dim = dimensionLabels[key] ?? { label: key, icon: "?" };
              return (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/60">{dim.label}</span>
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground/40">{value.toFixed(1)}</span>
                  </div>
                  <Progress value={value * 10} className={`h-1 ${barIndicator(value)}`} />
                </div>
              );
            })}
          </div>

          {/* Feedback */}
          {data.feedback && (
            <div className="border-t border-border/30 pt-3">
              <p className={`text-[13px] text-muted-foreground/70 leading-relaxed font-mono ${!expanded ? "line-clamp-3" : ""}`}>
                {data.feedback}
              </p>
              {data.feedback.length > 150 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-[11px] text-primary/60 hover:text-primary transition-colors mt-1"
                >
                  {expanded ? "collapse" : "expand"}
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
