"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { SessionStatus } from "@/lib/types";

function formatElapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - start) / 1000));

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return [
    hours > 0 ? `${hours}h` : null,
    (minutes > 0 || hours > 0) ? `${String(minutes).padStart(2, "0")}m` : null,
    `${String(seconds).padStart(2, "0")}s`,
  ].filter(Boolean).join(" ");
}

const stateConfig: Record<string, { color: string; glow: string }> = {
  running: { color: "text-emerald-400", glow: "shadow-emerald-500/10" },
  paused: { color: "text-amber-400", glow: "shadow-amber-500/10" },
  complete: { color: "text-sky-400", glow: "shadow-sky-500/10" },
  error: { color: "text-red-400", glow: "shadow-red-500/10" },
};

const phaseConfig: Record<string, { label: string; icon: string }> = {
  plan: { label: "Planning", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  generate: { label: "Generating", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
  evaluate: { label: "Evaluating", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  validate: { label: "Validating", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138" },
};

export function StatusCard({ data }: { data: SessionStatus | null }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!data?.startedAt) return;
    setElapsed(formatElapsed(data.startedAt));
    const interval = setInterval(() => setElapsed(formatElapsed(data.startedAt)), 1000);
    return () => clearInterval(interval);
  }, [data?.startedAt]);

  if (!data) {
    return (
      <Card className="border-dashed border-border/30">
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground/50 text-center">Waiting for status...</p>
        </CardContent>
      </Card>
    );
  }

  const cfg = stateConfig[data.state] ?? stateConfig.error;
  const phase = phaseConfig[data.phase] ?? { label: data.phase, icon: "" };

  return (
    <Card className={`shadow-lg ${cfg.glow} border-border/50`}>
      <CardContent className="py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className={`text-3xl font-bold font-mono uppercase tracking-widest ${cfg.color}`}>
              {data.state}
            </span>
            <div className="h-6 w-px bg-border/50" />
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={phase.icon} />
              </svg>
              <span className="text-sm text-muted-foreground font-medium">{phase.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {data.currentFeature && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Feature</span>
                <span className="text-sm font-medium truncate max-w-56">{data.currentFeature}</span>
              </div>
            )}
            {data.startedAt && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Elapsed</span>
                <span className="text-sm font-mono tabular-nums text-foreground/80">{elapsed}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
