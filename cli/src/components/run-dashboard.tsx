/**
 * RunDashboard component — full live progress UI for a harness run.
 *
 * Composes all dashboard sub-components into a unified view that updates in
 * real-time as the Python harness emits structured log events:
 *
 *  - {@link Header}               — title + live elapsed timer
 *  - Status line                  — "starting" | "running" | "complete" | "error"
 *  - {@link ProgressBar}          — filled/empty bar with percentage label
 *  - {@link CurrentFeatureDisplay} — currently-executing feature id, name, phase
 *  - {@link Timeline}             — scrollable list of completed feature results
 *  - {@link StatsRows}            — last evaluator score + cost breakdown
 *  - Keyboard hints               — q: quit  p: pause  d: dashboard
 *
 * All sections update reactively as new events are parsed from the log file.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { RunDashboard } from './components/run-dashboard.js';
 *
 * render(
 *   <RunDashboard
 *     specPath="spec.md"
 *     options={{ model: 'claude-opus-4-6' }}
 *     config={readConfig()}
 *   />
 * );
 * ```
 */

import React from "react";
import { Box, Text } from "ink";
import { useHarness } from "../hooks/use-harness.js";
import { Header } from "./header.js";
import { ProgressBar } from "./progress.js";
import { CurrentFeatureDisplay } from "./current-feature.js";
import type { CurrentFeatureState, Phase } from "./current-feature.js";
import { Timeline } from "./timeline.js";
import type { TimelineEntry } from "./timeline.js";
import { StatsRows } from "./stats-rows.js";
import { Completion } from "./completion.js";
import type { HarnessEvent, CostUpdateEvent, SessionCompleteEvent } from "../lib/types.js";
import type { HarnessConfig } from "../lib/types.js";
import type { BuildHarnessArgsOptions } from "../lib/process.js";
import { saveSessionToHistory } from "../lib/session-history.js";

// ---------------------------------------------------------------------------
// Helper functions (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Derive the currently-executing feature from the event timeline.
 *
 * Scans the timeline forward, tracking the most recent `feature_start` event
 * and updating the active phase based on subsequent events.  Returns `null`
 * when:
 *  - No `feature_start` event has arrived yet, or
 *  - The last feature has already received a `feature_complete` event.
 *
 * Phase progression:
 *  - After `feature_start`    → `"generate"`
 *  - After `validator_result` → `"validate"`
 *  - After `evaluator_result` → `"evaluate"`
 *
 * @param timeline - Ordered array of all parsed harness events.
 * @returns The current {@link CurrentFeatureState}, or `null` if no feature
 *   is actively running.
 *
 * @example
 * ```ts
 * const state = deriveCurrentFeature([
 *   { type: 'feature_start', id: 'F001', name: 'key generation', done: 0, total: 5, iteration: 1 },
 *   { type: 'validator_result', name: 'TypeCheck', passed: true },
 * ]);
 * // → { id: 'F001', name: 'key generation', phase: 'validate' }
 * ```
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
 *
 * Each entry is produced when a `feature_complete` event arrives.  The
 * `startOffsetMs` is approximated by accumulating `durationMs` values for
 * all previously completed features.  The `result` is `"passed"` when
 * the evaluator score is ≥ 7, otherwise `"failed"`.
 *
 * @param timeline - Ordered array of all parsed harness events.
 * @returns Array of timeline entries, ordered oldest-first.
 *
 * @example
 * ```ts
 * const entries = deriveTimelineEntries([
 *   { type: 'feature_start',    id: 'F001', done: 0, total: 2, iteration: 1, name: '' },
 *   { type: 'feature_complete', id: 'F001', score: 9, durationMs: 5000, complexity: 'simple' },
 *   { type: 'feature_start',    id: 'F002', done: 1, total: 2, iteration: 1, name: '' },
 *   { type: 'feature_complete', id: 'F002', score: 5, durationMs: 3000, complexity: 'simple' },
 * ]);
 * // → [
 * //   { startOffsetMs: 0,    durationMs: 5000, featureId: 'F001', result: 'passed' },
 * //   { startOffsetMs: 5000, durationMs: 3000, featureId: 'F002', result: 'failed' },
 * // ]
 * ```
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
 *
 * Scans the timeline in reverse order to locate the last cost update, which
 * carries the latest accumulated totals and per-agent cost breakdown.
 *
 * @param timeline - Ordered array of all parsed harness events.
 * @returns The most recent {@link CostUpdateEvent}, or `null` if none has
 *   arrived yet.
 *
 * @example
 * ```ts
 * const costUpdate = deriveLastCostUpdate([
 *   { type: 'cost_update', total: 0.5, byAgent: { gen: 0.5 } },
 *   { type: 'cost_update', total: 1.2, byAgent: { gen: 0.8, eval: 0.4 } },
 * ]);
 * // → { type: 'cost_update', total: 1.2, byAgent: { gen: 0.8, eval: 0.4 } }
 * ```
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
 *
 * Returns the last `session_complete` event, which carries the final stats
 * (passing count, total features, cost, duration) needed to render the
 * completion screen.
 *
 * @param timeline - Ordered array of all parsed harness events.
 * @returns The most recent {@link SessionCompleteEvent}, or `null` if none
 *   has arrived yet.
 *
 * @example
 * ```ts
 * const event = deriveSessionCompleteEvent([
 *   { type: 'session_complete', passing: 10, totalFeatures: 10, durationMs: 60000, cost: 2.5 },
 * ]);
 * // → { type: 'session_complete', passing: 10, totalFeatures: 10, ... }
 * ```
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
 * Determine the process exit code for a completed harness session.
 *
 * Returns `0` when all features passed (i.e. `passing === totalFeatures`).
 * Returns `1` in any other case — partial failures, no session_complete event
 * received, or a fatal `session_error` occurred.
 *
 * This implements the F053 requirement: exit 0 on full pass, exit 1 on
 * failures or error.
 *
 * @param event    - The `session_complete` event, or `null` if absent.
 * @param hadError - `true` when a `session_error` event was received instead
 *   of (or in addition to) a `session_complete` event.
 * @returns `0` on full pass, `1` on any failure or error.
 *
 * @example
 * ```ts
 * // All features passed → exit 0
 * getExitCode({ passing: 10, totalFeatures: 10, ... }, false); // 0
 *
 * // Some features failed → exit 1
 * getExitCode({ passing: 8, totalFeatures: 10, ... }, false);  // 1
 *
 * // Session error → exit 1
 * getExitCode(null, true);                                      // 1
 * ```
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
   * @example 'spec.md'
   */
  specPath: string;

  /**
   * Run-time flag overrides (model, evaluator model, dashboard URL, etc.).
   * Passed directly to {@link useHarness}.
   */
  options: BuildHarnessArgsOptions;

  /**
   * Full harness configuration loaded from `~/.harness/config.json`.
   * Used by {@link useHarness} to build the Python process arguments.
   */
  config: HarnessConfig;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full live progress dashboard for a harness run.
 *
 * Uses the {@link useHarness} hook to spawn the Python harness process and
 * stream its structured log output. Each section updates reactively as new
 * events arrive:
 *
 *  - **Header**: App title (`⬡ Harness`) and live elapsed timer.
 *  - **Status**: Current run status string (`starting` → `running` → …).
 *  - **Progress bar**: Fraction of features completed with percentage.
 *  - **Current feature**: ID, name, and active phase (generate/validate/evaluate).
 *  - **Timeline**: Scrollable list of completed features with durations.
 *  - **Stats rows**: Last evaluator score and cumulative cost breakdown.
 *  - **Keyboard hints**: Available keyboard shortcuts shown at the bottom.
 *
 * @param props - {@link RunDashboardProps}
 * @returns A React element containing the full dashboard layout.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { RunDashboard } from './components/run-dashboard.js';
 * import { readConfig } from './lib/config.js';
 *
 * render(
 *   <RunDashboard
 *     specPath="spec.md"
 *     options={{ model: 'claude-opus-4-6' }}
 *     config={readConfig()}
 *   />
 * );
 * ```
 */
export function RunDashboard({
  specPath,
  options,
  config,
}: RunDashboardProps): React.ReactElement {
  const runState = useHarness(specPath, options, config);

  const currentFeature = deriveCurrentFeature(runState.timeline);
  const timelineEntries = deriveTimelineEntries(runState.timeline);
  const costUpdate = deriveLastCostUpdate(runState.timeline);
  const sessionCompleteEvent = deriveSessionCompleteEvent(runState.timeline);

  // When the session finishes, unmount the progress view and render the
  // completion screen with the final stats. Use getExitCode() to determine
  // the correct exit code (0 = all features passed, 1 = failures or error).
  if (runState.done && runState.status === "complete" && sessionCompleteEvent !== null) {
    const dashboardUrl = options.dashboardUrl ?? config.dashboard.url;
    const exitCode = getExitCode(sessionCompleteEvent, false);
    return (
      <Completion
        event={sessionCompleteEvent}
        outputDir={config.output.defaultDir}
        dashboardUrl={dashboardUrl}
        onDone={() => {
          saveSessionToHistory(
            runState.sessionId ?? "unknown",
            specPath,
            sessionCompleteEvent,
            config,
          );
          process.exit(exitCode);
        }}
      />
    );
  }

  // When a session_error is received, show a minimal completion screen that
  // exits with code 1 when the user presses Enter.
  if (runState.done && runState.status === "error") {
    const dashboardUrl = options.dashboardUrl ?? config.dashboard.url;
    const errorEvent: SessionCompleteEvent = {
      type: "session_complete",
      passing: 0,
      totalFeatures: runState.progress?.total ?? 0,
      durationMs: 0,
      cost: runState.cost,
    };
    return (
      <Completion
        event={errorEvent}
        outputDir={config.output.defaultDir}
        dashboardUrl={dashboardUrl}
        onDone={() => {
          process.exit(1);
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header: title + elapsed timer */}
      <Header title="Harness" elapsed={runState.elapsed} />

      {/* Status line */}
      <Text>{"Status: "}{runState.status}</Text>

      {/* Progress bar — shown once the first feature_start event has arrived */}
      {runState.progress !== null && (
        <ProgressBar
          done={runState.progress.done}
          total={runState.progress.total}
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
        lastEvaluator={runState.lastEvaluator}
        costUpdate={costUpdate}
      />

      {/* Keyboard hints */}
      <Text dimColor>{"q: quit  p: pause  d: dashboard"}</Text>
    </Box>
  );
}
