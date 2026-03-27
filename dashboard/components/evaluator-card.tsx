"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { EvaluatorData } from "@/lib/types";

function scoreColor(score: number): string {
  if (score >= 7) return "text-[#a6e3a1]";
  if (score >= 5) return "text-[#f9e2af]";
  return "text-[#f38ba8]";
}

function scoreGlow(score: number): string {
  if (score >= 7) return "drop-shadow-[0_0_8px_rgba(166,227,161,0.3)]";
  if (score >= 5) return "drop-shadow-[0_0_8px_rgba(249,226,175,0.3)]";
  return "drop-shadow-[0_0_8px_rgba(243,139,168,0.3)]";
}

function barIndicator(score: number): string {
  if (score >= 7) return "[&_[data-slot=progress-indicator]]:bg-[#89b4fa]";
  if (score >= 5) return "[&_[data-slot=progress-indicator]]:bg-[#f9e2af]";
  return "[&_[data-slot=progress-indicator]]:bg-[#f38ba8]";
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
        <CardContent><p className="text-sm text-muted-foreground/70">No evaluation data</p></CardContent>
      </Card>
    );
  }

  const dimensions = Object.entries(data.dimensionScores) as [string, number][];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground/70">Evaluator</CardTitle>
          {data.passRate != null && !isNaN(data.passRate) && (
            <span className="text-xs font-mono text-muted-foreground/80">
              {Math.round(data.passRate * 100)}% pass rate
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Big score */}
          <div className="flex items-baseline gap-1.5">
            <span className={`text-5xl font-bold font-mono tabular-nums ${scoreColor(data.lastScore)} ${scoreGlow(data.lastScore)}`}>
              {data.lastScore.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground/70 font-mono">/10</span>
          </div>

          {/* Dimension bars */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {dimensions.map(([key, value]) => {
              const dim = dimensionLabels[key] ?? { label: key, icon: "?" };
              return (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/80">{dim.label}</span>
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground/70">{value.toFixed(1)}</span>
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
