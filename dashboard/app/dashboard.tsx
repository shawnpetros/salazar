"use client";

import { useEffect, useReducer, useCallback } from "react";
import type { DashboardState } from "@/lib/types";
import { EMPTY_STATE } from "@/lib/types";
import { StatusCard } from "@/components/status-card";
import { FeatureProgress } from "@/components/feature-progress";
import { SprintInfo } from "@/components/sprint-info";
import { CommitFeed } from "@/components/commit-feed";
import { EvaluatorCard } from "@/components/evaluator-card";
import { CostTracker } from "@/components/cost-tracker";
import { TimelineCard } from "@/components/timeline-card";

type Action =
  | { type: "SET_STATE"; payload: DashboardState }
  | { type: "SET_ERROR" };

function reducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case "SET_STATE":
      return action.payload;
    case "SET_ERROR":
      return state;
    default:
      return state;
  }
}

export function Dashboard() {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);

  const fetchInitial = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data: DashboardState = await res.json();
        dispatch({ type: "SET_STATE", payload: data });
      }
    } catch {
      console.error("[dashboard] Failed to fetch initial state");
    }
  }, []);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  useEffect(() => {
    const es = new EventSource("/api/stream");

    es.onmessage = (event) => {
      try {
        const data: DashboardState = JSON.parse(event.data);
        dispatch({ type: "SET_STATE", payload: data });
      } catch {
        console.error("[dashboard] Failed to parse SSE data");
      }
    };

    es.onerror = () => {
      // Expected: SSE stream closes after 55s, EventSource auto-reconnects
      console.log("[dashboard] SSE reconnecting...");
    };

    return () => {
      es.close();
    };
  }, []);

  const hasSession = state.sessionId !== null;
  const isLive = state.status?.state === "running";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
                <svg className="h-3.5 w-3.5 text-primary" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L14.5 5v6L8 15 1.5 11V5L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M8 5.5v5M5.5 8h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 className="text-sm font-semibold tracking-tight">
                Harness Monitor
              </h1>
            </div>
            {hasSession && (
              <code className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                {state.sessionId?.slice(0, 10)}
              </code>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isLive && <PulsingDot />}
            {state.status && <StatusPill state={state.status.state} />}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {!hasSession ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center">
              <svg className="h-8 w-8 text-muted-foreground/50 animate-pulse" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L21 7v10l-9 5-9-5V7l9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Waiting for harness connection</p>
              <p className="text-xs text-muted-foreground/60 mt-1 font-mono">python -m harness.main spec.md --dashboard-url ...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Status — full width */}
            <div className="lg:col-span-12">
              <StatusCard data={state.status} />
            </div>

            {/* Timeline — full width, right after status */}
            <div className="lg:col-span-12">
              <TimelineCard data={state.status} events={state.timeline} />
            </div>

            {/* Features — takes more space, it's the main event */}
            <div className="lg:col-span-7">
              <FeatureProgress data={state.features} />
            </div>

            {/* Sprint + Cost stacked */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <SprintInfo data={state.sprint} />
              <CostTracker data={state.cost} />
            </div>

            {/* Evaluator + Commits on same row */}
            <div className="lg:col-span-5">
              <EvaluatorCard data={state.evaluator} />
            </div>
            <div className="lg:col-span-7">
              <CommitFeed data={state.commits} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/50 font-mono">agent-id harness v0.1</span>
          <span className="text-[11px] text-muted-foreground/50">SSE {hasSession ? "connected" : "disconnected"}</span>
        </div>
      </footer>
    </div>
  );
}

function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
    </span>
  );
}

function StatusPill({ state }: { state: string }) {
  const variants: Record<string, string> = {
    running: "bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-sky-500/5 shadow-sm",
    paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    complete: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium font-mono uppercase tracking-wider ${variants[state] ?? variants.error}`}>
      {state}
    </span>
  );
}
