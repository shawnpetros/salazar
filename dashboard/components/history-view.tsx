"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionSummary } from "@/lib/types";

function formatDuration(ms: number): string {
  if (ms <= 0) return "--";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground/70";
  if (score >= 7) return "text-[#a6e3a1]";
  if (score >= 5) return "text-[#f9e2af]";
  return "text-[#f38ba8]";
}

export function HistoryView({ onBack }: { onBack: () => void }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        setSessions(data.sessions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Session History</h2>
        <button
          onClick={onBack}
          className="text-sm text-[#cba6f7] hover:text-[#cba6f7]/80 transition-colors font-mono"
        >
          &larr; back to live
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground/70">Loading...</p>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed border-border/30">
          <CardContent className="py-12">
            <p className="text-sm text-muted-foreground/70 text-center">
              No completed sessions yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sessions.map((s) => (
            <Card key={s.sessionId} className="hover:border-[#cba6f7]/30 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  {/* Left: name + description */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-[#cba6f7] truncate">
                          {s.specName ?? s.sessionId.slice(0, 10)}
                        </span>
                        <code className="text-[10px] font-mono text-muted-foreground/50 bg-muted/30 px-1.5 py-0.5 rounded shrink-0">
                          {s.sessionId.slice(0, 8)}
                        </code>
                      </div>
                      <span className="text-[12px] text-muted-foreground/60 mt-0.5">
                        {formatDate(s.completedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right: stats */}
                  <div className="flex items-center gap-6 shrink-0">
                    {/* Features */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Features</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold font-mono tabular-nums text-[#a6e3a1]">
                          {s.featuresPassing}
                        </span>
                        <span className="text-xs text-muted-foreground/50 font-mono">/{s.featuresTotal}</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Score</span>
                      <span className={`text-lg font-bold font-mono tabular-nums ${scoreColor(s.avgEvaluatorScore)}`}>
                        {s.avgEvaluatorScore != null ? s.avgEvaluatorScore.toFixed(1) : "--"}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Time</span>
                      <span className="text-lg font-mono tabular-nums text-[#89b4fa]">
                        {formatDuration(s.totalTimeMs)}
                      </span>
                    </div>

                    {/* Cost */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Cost</span>
                      <span className="text-lg font-mono tabular-nums text-foreground/80">
                        {formatCost(s.totalCost)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
