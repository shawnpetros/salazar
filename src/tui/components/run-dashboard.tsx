/**
 * RunDashboard component -- full live progress UI for an engine run.
 *
 * Composes all dashboard sub-components into a unified view that updates in
 * real-time as the engine emits structured events:
 *
 *  - {@link Header}               -- title + live elapsed timer
 *  - Status line                  -- "starting" | "running" | "complete" | "error"
 *  - {@link ProgressBar}          -- filled/empty bar with percentage label
 *  - {@link CurrentFeatureDisplay} -- currently-executing feature id, name, phase
 *  - {@link Timeline}             -- scrollable list of completed feature results
 *  - {@link StatsRows}            -- last evaluator score + cost breakdown
 *  - Keyboard hints               -- q: quit
 */

import React from "react";
import { Box, Text } from "ink";
import { useEngine } from "../hooks/use-engine.js";
import { useTimer } from "../hooks/use-timer.js";
import { Header } from "./header.js";
import { ProgressBar } from "./progress.js";
import { CurrentFeatureDisplay } from "./current-feature.js";
import type { CurrentFeatureState, Phase } from "./current-feature.js";
import { Timeline } from "./timeline.js";
import type { TimelineEntry } from "./timeline.js";
import { StatsRows } from "./stats-rows.js";
import { Completion } from "./completion.js";
import type { HarnessEvent, CostUpdateEvent, SessionCompleteEvent } from "../../lib/types.js";
import { getOutputDir } from "../../lib/paths.js";

// ---------------------------------------------------------------------------
// Helper functions (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Derive the currently-executing feature from the event timeline.
 */
export function deriveCurrentFeature(
  timeline: HarnessEvent[]
): CurrentFeatureState | null {
  let currentId: string | null = null;
  let currentName = "";
  let currentPhase: Phase = "generate";
  let completed = false;

  for (const event of timeline) {
    if (event.type === "feature_start") {
      currentId = event.id;
      currentName = event.name;
      currentPhase = "generate";
      completed = false;
    } else if (currentId !== null) {
      if (event.type === "validator_result") {
        currentPhase = "validate";
      } else if (event.type === "evaluator_result") {
        currentPhase = "evaluate";
      } else if (event.type === "feature_complete") {
        completed = true;
      }
    }
  }

  if (!currentId || completed) return null;

  return { id: currentId, name: currentName, phase: currentPhase };
}

/**
 * Derive an ordered list of {@link TimelineEntry} records from the event timeline.
 */
export function deriveTimelineEntries(timeline: HarnessEvent[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const featureStartOffsets: Record<string, number> = {};
  let cumulativeMs = 0;

  for (const event of timeline) {
    if (event.type === "feature_start") {
      featureStartOffsets[event.id] = cumulativeMs;
    } else if (event.type === "feature_complete") {
      const startOffset = featureStartOffsets[event.id] ?? 0;
      const result =
        event.score !== null && event.score >= 7 ? "passed" : "failed";
      entries.push({
        startOffsetMs: startOffset,
        durationMs: event.durationMs,
        featureId: event.id,
        result,
      });
      cumulativeMs = startOffset + event.durationMs;
    }
  }

  return entries;
}

/**
 * Find the most recent `cost_update` event from the timeline.
 */
export function deriveLastCostUpdate(
  timeline: HarnessEvent[]
): CostUpdateEvent | null {
  for (let i = timeline.length - 1; i >= 0; i--) {
    const event = timeline[i];
    if (event !== undefined && event.type === "cost_update") {
      return event;
    }
  }
  return null;
}

/**
 * Find the most recent `session_complete` event from the timeline.
 */
export function deriveSessionCompleteEvent(
  timeline: HarnessEvent[]
): SessionCompleteEvent | null {
  for (let i = timeline.length - 1; i >= 0; i--) {
    const event = timeline[i];
    if (event !== undefined && event.type === "session_complete") {
      return event;
    }
  }
  return null;
}

/**
 * Determine the process exit code for a completed session.
 * Returns 0 when all features passed, 1 otherwise.
 */
export function getExitCode(
  event: SessionCompleteEvent | null,
  hadError: boolean
): 0 | 1 {
  if (hadError) return 1;
  if (event === null) return 1;
  if (event.passing === event.totalFeatures) return 0;
  return 1;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props accepted by the {@link RunDashboard} component. */
export interface RunDashboardProps {
  /**
   * Path to the feature spec file being run.
   */
  specPath: string;

  /**
   * Optional output directory override.
   */
  outputDir?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full live progress dashboard for an engine run.
 *
 * Uses the {@link useEngine} hook to start the orchestrator and stream
 * events. Each section updates reactively as new events arrive.
 */
export function RunDashboard({
  specPath,
  outputDir,
}: RunDashboardProps): React.ReactElement {
  const engineState = useEngine(specPath, outputDir);
  const elapsed = useTimer();

  const currentFeature = deriveCurrentFeature(engineState.timeline);
  const timelineEntries = deriveTimelineEntries(engineState.timeline);
  const costUpdate = deriveLastCostUpdate(engineState.timeline);
  const sessionCompleteEvent = deriveSessionCompleteEvent(engineState.timeline);

  const resolvedOutputDir = outputDir ?? getOutputDir();

  // Completion screen -- session finished successfully
  if (engineState.done && engineState.status === "complete" && sessionCompleteEvent !== null) {
    const exitCode = getExitCode(sessionCompleteEvent, false);
    return (
      <Completion
        event={sessionCompleteEvent}
        outputDir={resolvedOutputDir}
        onDone={() => {
          process.exit(exitCode);
        }}
      />
    );
  }

  // Error screen -- session errored
  if (engineState.done && engineState.status === "error") {
    const errorEvent: SessionCompleteEvent = {
      type: "session_complete",
      passing: 0,
      totalFeatures: engineState.progress?.total ?? 0,
      durationMs: 0,
      cost: engineState.cost,
    };
    return (
      <Completion
        event={errorEvent}
        outputDir={resolvedOutputDir}
        onDone={() => {
          process.exit(1);
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header: title + elapsed timer */}
      <Header title="Salazar" elapsed={elapsed} />

      {/* Status line */}
      <Text>{"Status: "}{engineState.status}</Text>

      {/* Progress bar -- shown once the first feature_start event has arrived */}
      {engineState.progress !== null && (
        <ProgressBar
          done={engineState.progress.done}
          total={engineState.progress.total}
        />
      )}

      {/* Currently-executing feature */}
      {currentFeature !== null && (
        <CurrentFeatureDisplay currentFeature={currentFeature} />
      )}

      {/* Timeline of completed features */}
      {timelineEntries.length > 0 && (
        <Timeline entries={timelineEntries} />
      )}

      {/* Evaluator score + cost rows */}
      <StatsRows
        lastEvaluator={engineState.lastEvaluator}
        costUpdate={costUpdate}
      />

      {/* Keyboard hints */}
      <Text dimColor>{"q: quit"}</Text>
    </Box>
  );
}
