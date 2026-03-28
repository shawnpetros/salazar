/**
 * useHarness hook — spawns the Python harness process, tails its log file,
 * and accumulates structured run state from parsed log events.
 *
 * This is the central hook for the `run` command UI.  It wires together:
 * - {@link spawnHarness} / {@link buildHarnessArgs} to launch the Python process
 * - {@link useLogTail} to stream new lines from the harness log file
 * - {@link parseLine} to decode each raw log line into a typed {@link HarnessEvent}
 * - {@link useTimer} to surface a human-readable elapsed time string
 *
 * @example
 * ```tsx
 * function RunView({ specPath, config }: Props) {
 *   const { sessionId, status, progress, cost, elapsed, done } = useHarness(
 *     specPath,
 *     {},
 *     config,
 *   );
 *   return <Text>{status} — {elapsed}</Text>;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useInput, useStdin } from "ink";
import { execa } from "execa";
import type { ResultPromise } from "execa";
import crypto from "node:crypto";
import { useLogTail } from "./use-log-tail.js";
import { useTimer } from "./use-timer.js";
import { parseLine } from "../lib/log-parser.js";
import { buildHarnessArgs, createLogPath, killHarness } from "../lib/process.js";
import type { HarnessConfig, EvaluatorResultEvent, HarnessEvent } from "../lib/types.js";
import type { BuildHarnessArgsOptions } from "../lib/process.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The status of the harness run.
 *
 * - `"starting"` — the hook has mounted but no `session_start` event has arrived yet.
 * - `"running"` — the session is active (a `session_start` event has been received).
 * - `"complete"` — the session ended successfully (`session_complete` event received).
 * - `"error"` — the session ended with a fatal error (`session_error` event received).
 */
export type HarnessStatus = "starting" | "running" | "complete" | "error";

/**
 * Progress information derived from `feature_start` events.
 */
export interface HarnessProgress {
  /** Number of features completed so far. */
  done: number;
  /** Total number of features to complete. */
  total: number;
}

/**
 * Accumulated run state returned by {@link useHarness}.
 *
 * All fields update reactively as new log events are parsed.
 */
export interface HarnessRunState {
  /** Session identifier from the first `session_start` event, or `null` before it arrives. */
  sessionId: string | null;
  /** Current run status. */
  status: HarnessStatus;
  /** Feature progress, or `null` before the first `feature_start` event. */
  progress: HarnessProgress | null;
  /** Ordered list of all parsed {@link HarnessEvent}s received so far. */
  timeline: HarnessEvent[];
  /** The most recent evaluator result, or `null` if none has arrived yet. */
  lastEvaluator: EvaluatorResultEvent | null;
  /** Accumulated cost in USD (updated by `cost_update` and `session_complete` events). */
  cost: number;
  /** Human-readable elapsed time since the hook mounted (e.g. `"1m 5s"`). */
  elapsed: string;
  /** `true` once the session has finished (either `session_complete` or `session_error`). */
  done: boolean;
  /** `true` while the run is paused via the `p` key. */
  paused: boolean;
  /** The underlying execa child process handle, or `null` before it is spawned. */
  proc: ResultPromise | null;
}

// ---------------------------------------------------------------------------
// reduceEvent — pure state reducer (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Internal mutable state shape used by {@link reduceEvent}.
 *
 * @internal
 */
export interface HarnessMutableState {
  sessionId: string | null;
  status: HarnessStatus;
  progress: HarnessProgress | null;
  timeline: HarnessEvent[];
  lastEvaluator: EvaluatorResultEvent | null;
  cost: number;
  done: boolean;
}

/**
 * Pure reducer that applies a single {@link HarnessEvent} to a copy of the
 * current accumulated state and returns the updated state.
 *
 * Keeping this logic outside the hook makes it trivially unit-testable without
 * needing to render React components.
 *
 * @param state  - Current accumulated run state (not mutated).
 * @param event  - The parsed event to apply.
 * @returns A new state object reflecting the applied event.
 */
export function reduceEvent(
  state: HarnessMutableState,
  event: HarnessEvent,
): HarnessMutableState {
  // Always append to timeline
  const timeline = [...state.timeline, event];

  switch (event.type) {
    case "session_start":
      return {
        ...state,
        timeline,
        sessionId: event.sessionId,
        status: "running",
      };

    case "feature_start":
      return {
        ...state,
        timeline,
        progress: { done: event.done, total: event.total },
      };

    case "evaluator_result":
      return {
        ...state,
        timeline,
        lastEvaluator: event,
      };

    case "cost_update":
      return {
        ...state,
        timeline,
        cost: event.total,
      };

    case "session_complete":
      return {
        ...state,
        timeline,
        cost: event.cost,
        status: "complete",
        done: true,
      };

    case "session_error":
      return {
        ...state,
        timeline,
        status: "error",
        done: true,
      };

    default:
      // planner_complete, feature_complete, validator_result — append only
      return { ...state, timeline };
  }
}

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

/**
 * Creates a fresh initial {@link HarnessMutableState} with all fields at their
 * zero / null values.
 *
 * @returns A new default state object.
 */
export function createInitialState(): HarnessMutableState {
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

// ---------------------------------------------------------------------------
// openInBrowser — platform-agnostic URL opener
// ---------------------------------------------------------------------------

/**
 * Opens a URL in the system's default web browser.
 *
 * Uses the appropriate platform command:
 * - macOS: `open <url>`
 * - Windows: `start <url>`
 * - Linux/other: `xdg-open <url>`
 *
 * Any errors (e.g. the command not found) are swallowed so callers can treat
 * this as a best-effort fire-and-forget operation.
 *
 * @param url - The URL to open in the default browser.
 * @returns A `Promise<void>` that resolves once the open command has been
 *   invoked (or silently fails).  The promise never rejects.
 */
export async function openInBrowser(url: string): Promise<void> {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  try {
    await execa(command, [url]);
  } catch {
    // Best-effort — swallow any errors (command not found, etc.).
  }
}

// ---------------------------------------------------------------------------
// handleHarnessKey — pure keyboard dispatch (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Options passed to {@link handleHarnessKey} describing the current harness
 * state and the side-effect callbacks to invoke for each key.
 */
export interface HarnessKeyHandlerOptions {
  /** The child process handle; `null` if the process has not yet spawned. */
  proc: ResultPromise | null;
  /**
   * The dashboard URL to open when `d` is pressed, or `null`/`undefined` if
   * no dashboard URL has been configured.
   */
  dashboardUrl?: string | null;
  /**
   * When `false` the keyboard handler is a no-op.  Typically set to
   * `!runState.done` so that keys are ignored once the run has ended.
   */
  isActive: boolean;
  /**
   * Called after `killHarness` resolves when `q` is pressed.
   * The default implementation calls `process.exit(1)`.
   */
  onKill: () => void;
  /**
   * Called when `p` is pressed.  Toggles the paused display state.
   */
  onTogglePause: () => void;
  /**
   * Called with the dashboard URL when `d` is pressed and a URL is available.
   * The default implementation delegates to {@link openInBrowser}.
   */
  onOpenDashboard: (url: string) => void;
}

/**
 * Pure keyboard dispatch function for the harness run UI.
 *
 * Interprets a single key character and triggers the appropriate side-effect
 * via the supplied callbacks.  Extracting this logic from the hook makes it
 * trivially unit-testable without needing to render an Ink component.
 *
 * **Key bindings:**
 * - `q` — Calls `killHarness(proc)` (if a process exists) then `onKill()`.
 * - `p` — Calls `onTogglePause()`.
 * - `d` — Calls `onOpenDashboard(dashboardUrl)` when a dashboard URL is set.
 *
 * @param key     - The single character received from the terminal.
 * @param options - Current state and side-effect callbacks.
 */
export function handleHarnessKey(
  key: string,
  options: HarnessKeyHandlerOptions,
): void {
  if (!options.isActive) return;

  if (key === "q") {
    if (options.proc !== null) {
      void killHarness(options.proc).finally(() => {
        options.onKill();
      });
    } else {
      options.onKill();
    }
  } else if (key === "p") {
    options.onTogglePause();
  } else if (key === "d" && options.dashboardUrl) {
    options.onOpenDashboard(options.dashboardUrl);
  }
}

// ---------------------------------------------------------------------------
// useHarness hook
// ---------------------------------------------------------------------------

/**
 * React hook that spawns the Python harness process, tails its log file, and
 * returns live-updating run state.
 *
 * **Lifecycle**
 * 1. On mount, a unique session ID is derived and a log file path is created
 *    under `~/.harness/logs/<id>.log`.
 * 2. The Python process is spawned via `python3 -m harness <specPath> [flags]`
 *    with the log path appended as `--log <path>`.
 * 3. {@link useLogTail} begins watching the log file; each new line is decoded
 *    by {@link parseLine} and folded into the accumulated run state via
 *    {@link reduceEvent}.
 * 4. On unmount the child process is sent `SIGTERM`.
 *
 * @param specPath - Path to the feature spec file to pass to the harness.
 * @param options  - Optional per-run flag overrides (model, evaluator model, etc.).
 * @param config   - Harness configuration loaded from `~/.harness/config.json`.
 * @returns Live {@link HarnessRunState} that updates on each parsed log event.
 */
export function useHarness(
  specPath: string,
  options: BuildHarnessArgsOptions,
  config: HarnessConfig,
): HarnessRunState {
  // Generate a stable ephemeral ID and log path on the very first render so
  // that useLogTail always receives a non-empty path (it is called
  // unconditionally, as required by the Rules of Hooks).
  const tempIdRef = useRef<string>(
    crypto.randomUUID().replace(/-/g, "").slice(0, 12),
  );
  const logPathRef = useRef<string>(createLogPath(tempIdRef.current));

  // Accumulated run state
  const [runState, setRunState] = useState<HarnessMutableState>(
    createInitialState,
  );

  // The child process handle — stored in a ref so we can kill it on unmount
  // without triggering a re-render and without stale closure issues.
  const procRef = useRef<ResultPromise | null>(null);
  const [proc, setProc] = useState<ResultPromise | null>(null);

  // Paused state — toggled by the `p` key
  const [paused, setPaused] = useState(false);

  // Elapsed time from the timer hook
  const elapsed = useTimer();

  // Spawn the Python process on mount
  useEffect(() => {
    const args = buildHarnessArgs(specPath, options, config);
    args.push("--log", logPathRef.current);

    const p = execa("python3", args);
    procRef.current = p;
    setProc(p);

    // Silence unhandled rejections — process exit codes are communicated
    // via structured log events, not via the execa promise rejection.
    // Without this, a non-zero exit code would produce an unhandled rejection
    // that could bleed across test boundaries.
    p.catch(() => {});

    return () => {
      // Graceful teardown: send SIGTERM and swallow any errors.
      try {
        p.kill("SIGTERM");
      } catch {
        // Process may have already exited — safe to ignore.
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse each new log line and fold it into accumulated run state
  const handleLine = useCallback((line: string) => {
    const event = parseLine(line);
    if (!event) return;

    setRunState((prev) => reduceEvent(prev, event));
  }, []);

  useLogTail(logPathRef.current, handleLine);

  // Resolve the effective dashboard URL (option override takes precedence)
  const dashboardUrl =
    options.dashboardUrl ?? config.dashboard.url ?? null;

  // Only enable raw-mode keyboard input when the terminal supports it.
  // In non-TTY environments (e.g. tests, CI, piped input) isRawModeSupported
  // is false, and passing isActive: false to useInput prevents Ink from
  // calling setRawMode() which would throw in those environments.
  const { isRawModeSupported } = useStdin();

  // Keyboard handler — q quits, p pauses, d opens the dashboard
  useInput((input) => {
    handleHarnessKey(input, {
      proc: procRef.current,
      dashboardUrl,
      isActive: !runState.done,
      onKill: () => {
        process.exit(1);
      },
      onTogglePause: () => {
        setPaused((prev) => !prev);
      },
      onOpenDashboard: (url) => {
        void openInBrowser(url);
      },
    });
  // isRawModeSupported can be undefined (not just false) when stdin is not a
  // TTY.  We must pass a strict boolean false to prevent useInput from calling
  // setRawMode(true) in environments that do not support it.
  }, { isActive: isRawModeSupported === true && !runState.done });

  return {
    sessionId: runState.sessionId,
    status: runState.status,
    progress: runState.progress,
    timeline: runState.timeline,
    lastEvaluator: runState.lastEvaluator,
    cost: runState.cost,
    elapsed,
    done: runState.done,
    paused,
    proc,
  };
}
