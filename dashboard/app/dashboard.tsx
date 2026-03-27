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
import { Badge } from "@/components/ui/badge";

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
      console.error("[dashboard] SSE error, will auto-reconnect");
    };

    return () => {
      es.close();
    };
  }, []);

  const hasSession = state.sessionId !== null;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight font-[family-name:var(--font-geist-sans)]">
            Harness Monitor
          </h1>
          {hasSession ? (
            <Badge variant="outline" className="font-mono text-xs">
              {state.sessionId?.slice(0, 8)}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              No active session
            </Badge>
          )}
        </div>
        {state.status && (
          <StatusBadge state={state.status.state} />
        )}
      </header>

      <div className="flex-1 p-4 md:p-6">
        {!hasSession ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">Waiting for harness connection...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <StatusCard data={state.status} />
            </div>
            <FeatureProgress data={state.features} />
            <SprintInfo data={state.sprint} />
            <EvaluatorCard data={state.evaluator} />
            <CostTracker data={state.cost} />
            <div className="md:col-span-2">
              <CommitFeed data={state.commits} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ state }: { state: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    running: { label: "LIVE", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    paused: { label: "PAUSED", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    complete: { label: "COMPLETE", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    error: { label: "ERROR", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };

  const v = variants[state] ?? variants.error;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${v.className}`}>
      {state === "running" && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}
      {v.label}
    </span>
  );
}
