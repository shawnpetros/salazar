"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { EvaluatorData } from "@/lib/types";

function scoreColor(score: number): string {
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-yellow-400";
  return "text-red-400";
}

function barColor(score: number): string {
  if (score >= 7) return "[&_[data-slot=progress-indicator]]:bg-emerald-500";
  if (score >= 5) return "[&_[data-slot=progress-indicator]]:bg-yellow-500";
  return "[&_[data-slot=progress-indicator]]:bg-red-500";
}

const dimensionLabels: Record<string, string> = {
  specCompliance: "Spec Compliance",
  codeQuality: "Code Quality",
  security: "Security",
  usability: "Usability",
};

export function EvaluatorCard({ data }: { data: EvaluatorData | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No evaluation data</p>
        </CardContent>
      </Card>
    );
  }

  const dimensions = Object.entries(data.dimensionScores) as [string, number][];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Evaluator</span>
          <span className="text-xs text-muted-foreground font-normal tabular-nums">
            Pass rate: {Math.round(data.passRate * 100)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-bold font-[family-name:var(--font-geist-mono)] tabular-nums ${scoreColor(data.lastScore)}`}>
              {data.lastScore.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground font-[family-name:var(--font-geist-mono)]">/10</span>
          </div>

          <div className="flex flex-col gap-2">
            {dimensions.map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {dimensionLabels[key] ?? key}
                  </span>
                  <span className="text-xs font-[family-name:var(--font-geist-mono)] text-muted-foreground tabular-nums">
                    {value.toFixed(1)}
                  </span>
                </div>
                <Progress value={value * 10} className={barColor(value)} />
              </div>
            ))}
          </div>

          {data.feedback && (
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Feedback:</span>
              <p
                className={`text-sm text-muted-foreground leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}
              >
                {data.feedback}
              </p>
              {data.feedback.length > 120 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors self-start mt-0.5"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
