import { useState, useEffect, useRef } from "react";
import { Orchestrator } from "../../engine/orchestrator.js";
import { loadConfig } from "../../lib/config.js";
import { getOutputDir } from "../../lib/paths.js";
import type { HarnessEvent, EvaluatorResultEvent } from "../../lib/types.js";

export type EngineStatus = "starting" | "running" | "complete" | "error";

export interface EngineProgress {
  done: number;
  total: number;
}

export interface EngineState {
  sessionId: string | null;
  status: EngineStatus;
  progress: EngineProgress | null;
  timeline: HarnessEvent[];
  lastEvaluator: EvaluatorResultEvent | null;
  cost: number;
  done: boolean;
}

// Ported from cli/src/hooks/use-harness.ts — same pure reducer logic
export function reduceEvent(state: EngineState, event: HarnessEvent): EngineState {
  const timeline = [...state.timeline, event];
  switch (event.type) {
    case "session_start":
      return { ...state, timeline, sessionId: event.sessionId, status: "running" };
    case "feature_start":
      return { ...state, timeline, progress: { done: event.done, total: event.total } };
    case "evaluator_result":
      return { ...state, timeline, lastEvaluator: event };
    case "cost_update":
      return { ...state, timeline, cost: event.total };
    case "session_complete":
      return { ...state, timeline, cost: event.cost, status: "complete", done: true };
    case "session_error":
      return { ...state, timeline, status: "error", done: true };
    default:
      return { ...state, timeline };
  }
}

export function createInitialState(): EngineState {
  return {
    sessionId: null,
    status: "starting",
    progress: null,
    timeline: [],
    lastEvaluator: null,
    cost: 0,
    done: false,
  };
}

export function useEngine(specPath: string, outputDir?: string): EngineState {
  const [state, setState] = useState<EngineState>(createInitialState);
  const engineRef = useRef<Orchestrator | null>(null);

  useEffect(() => {
    const config = loadConfig();
    const dir = outputDir ?? getOutputDir();
    const engine = new Orchestrator(specPath, dir, config);
    engineRef.current = engine;

    const events = [
      "sessionStart",
      "plannerComplete",
      "featureStart",
      "featureComplete",
      "validatorResult",
      "evaluatorResult",
      "costUpdate",
      "sessionComplete",
      "sessionError",
    ] as const;

    for (const name of events) {
      engine.on(name, (event: HarnessEvent) => {
        setState(prev => reduceEvent(prev, event));
      });
    }

    engine.run().catch(err => {
      engine.emit("sessionError", { type: "session_error", error: String(err) });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specPath, outputDir]);

  return state;
}
