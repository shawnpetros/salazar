"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SessionStatus } from "@/lib/types";

function formatElapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - start) / 1000));

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

const stateColors: Record<string, string> = {
  running: "text-emerald-400",
  paused: "text-yellow-400",
  complete: "text-blue-400",
  error: "text-red-400",
};

const phaseLabels: Record<string, string> = {
  plan: "Planning",
  generate: "Generating",
  evaluate: "Evaluating",
  validate: "Validating",
};

export function StatusCard({ data }: { data: SessionStatus | null }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!data?.startedAt) return;

    setElapsed(formatElapsed(data.startedAt));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(data.startedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.startedAt]);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No status data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className={`text-2xl font-bold font-[family-name:var(--font-geist-mono)] uppercase tracking-wider ${stateColors[data.state] ?? "text-muted-foreground"}`}>
              {data.state}
            </span>
            <Badge variant="outline" className="text-xs">
              {phaseLabels[data.phase] ?? data.phase}
            </Badge>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {data.currentFeature && (
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide">Feature:</span>
                <span className="text-foreground font-medium truncate max-w-48">
                  {data.currentFeature}
                </span>
              </div>
            )}
            {data.startedAt && (
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide">Elapsed:</span>
                <span className="text-foreground font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {elapsed}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
