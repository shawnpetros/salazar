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
  running: { color: "text-sky-400", glow: "shadow-sky-500/10" },
  paused: { color: "text-[#f9e2af]", glow: "shadow-[#f9e2af]/10" },
  complete: { color: "text-[#89b4fa]", glow: "shadow-[#89b4fa]/10" },
  error: { color: "text-[#f38ba8]", glow: "shadow-[#f38ba8]/10" },
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

    // Don't tick when the job is finished — freeze the clock
    if (data.state === "complete" || data.state === "error") return;

    const interval = setInterval(() => setElapsed(formatElapsed(data.startedAt)), 1000);
    return () => clearInterval(interval);
  }, [data?.startedAt, data?.state]);

  if (!data) {
    return (
      <Card className="border-dashed border-border/30">
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground/80 text-center">Waiting for status...</p>
        </CardContent>
      </Card>
    );
  }

  const cfg = stateConfig[data.state] ?? stateConfig.error;
  const phase = phaseConfig[data.phase] ?? { label: data.phase, icon: "" };

  return (
    <Card className={`shadow-lg ${cfg.glow} border-border/50`}>
      <CardContent className="py-4 sm:py-5">
        {/* Top row: status + clock */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-5">
            <span className={`text-2xl sm:text-3xl font-bold font-mono uppercase tracking-widest ${cfg.color}`}>
              {data.state}
            </span>
            <div className="h-5 w-px bg-border/50 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={phase.icon} />
              </svg>
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">{phase.label}</span>
            </div>
          </div>

          {data.startedAt && (
            <span className="text-xl sm:text-2xl font-mono tabular-nums font-semibold text-foreground/90 tracking-tight">
              {elapsed}
            </span>
          )}
        </div>

        {/* Bottom row: current feature (only if present) */}
        {data.currentFeature && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mr-2">Feature</span>
            <span className="text-sm text-foreground/80 truncate">{data.currentFeature}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
