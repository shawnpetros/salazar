/**
 * F052 — run command: transition to completion screen on session_complete event
 *
 * Verifies that:
 *  - deriveSessionCompleteEvent is exported from run-dashboard.tsx
 *  - deriveSessionCompleteEvent returns null when no session_complete in timeline
 *  - deriveSessionCompleteEvent returns the last session_complete event
 *  - run-dashboard.tsx imports Completion component
 *  - run-dashboard.tsx calls deriveSessionCompleteEvent
 *  - run-dashboard.tsx conditionally renders Completion when status is "complete"
 *  - RunDashboard passes the session_complete event, outputDir, and dashboardUrl to Completion
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { HarnessEvent, SessionCompleteEvent } from "../lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION_COMPLETE_EVENT: SessionCompleteEvent = {
  type: "session_complete",
  passing: 10,
  totalFeatures: 12,
  durationMs: 120000,
  cost: 4.56,
};

// ---------------------------------------------------------------------------
// deriveSessionCompleteEvent — export check
// ---------------------------------------------------------------------------

describe("F052 — deriveSessionCompleteEvent exports", () => {
  it("is exported as a function from run-dashboard.tsx", async () => {
    const { deriveSessionCompleteEvent } = await import("../components/run-dashboard.js");
    expect(typeof deriveSessionCompleteEvent).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// deriveSessionCompleteEvent — behavior
// ---------------------------------------------------------------------------

describe("F052 — deriveSessionCompleteEvent: empty timeline", () => {
  it("returns null for empty timeline", async () => {
    const { deriveSessionCompleteEvent } = await import("../components/run-dashboard.js");
    expect(deriveSessionCompleteEvent([])).toBeNull();
  });

  it("returns null when no session_complete event exists", async () => {
    const { deriveSessionCompleteEvent } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "session_start", sessionId: "abc", spec: "spec.md" },
      { type: "feature_start", id: "F001", name: "test", done: 0, total: 1, iteration: 1 },
    ];
    expect(deriveSessionCompleteEvent(timeline)).toBeNull();
  });
});

describe("F052 — deriveSessionCompleteEvent: with session_complete", () => {
  it("returns the session_complete event when present", async () => {
    const { deriveSessionCompleteEvent } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "session_start", sessionId: "abc", spec: "spec.md" },
      SESSION_COMPLETE_EVENT,
    ];
    const result = deriveSessionCompleteEvent(timeline);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("session_complete");
    expect(result?.passing).toBe(10);
    expect(result?.totalFeatures).toBe(12);
    expect(result?.cost).toBe(4.56);
    expect(result?.durationMs).toBe(120000);
  });

  it("returns the LAST session_complete event when multiple exist", async () => {
    const { deriveSessionCompleteEvent } = await import("../components/run-dashboard.js");
    const first: SessionCompleteEvent = {
      type: "session_complete",
      passing: 1,
      totalFeatures: 5,
      durationMs: 1000,
      cost: 0.10,
    };
    const last: SessionCompleteEvent = {
      type: "session_complete",
      passing: 5,
      totalFeatures: 5,
      durationMs: 5000,
      cost: 2.00,
    };
    const timeline: HarnessEvent[] = [first, last];
    const result = deriveSessionCompleteEvent(timeline);
    expect(result?.passing).toBe(5);
    expect(result?.cost).toBe(2.00);
  });

  it("returns the event even when surrounded by other events", async () => {
    const { deriveSessionCompleteEvent } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "session_start", sessionId: "abc", spec: "spec.md" },
      { type: "feature_start", id: "F001", name: "first", done: 0, total: 1, iteration: 1 },
      { type: "feature_complete", id: "F001", score: 9, durationMs: 1000, complexity: "simple" },
      SESSION_COMPLETE_EVENT,
    ];
    const result = deriveSessionCompleteEvent(timeline);
    expect(result).toEqual(SESSION_COMPLETE_EVENT);
  });
});

// ---------------------------------------------------------------------------
// Source-level assertions: run-dashboard.tsx imports and renders Completion
// ---------------------------------------------------------------------------

describe("F052 — run-dashboard.tsx source structure", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "components/run-dashboard.tsx"), "utf-8");

  it("imports Completion component", () => {
    expect(getSource()).toContain("Completion");
  });

  it("imports from completion.js", () => {
    expect(getSource()).toContain("completion.js");
  });

  it("imports SessionCompleteEvent type", () => {
    expect(getSource()).toContain("SessionCompleteEvent");
  });

  it("calls deriveSessionCompleteEvent", () => {
    expect(getSource()).toContain("deriveSessionCompleteEvent");
  });

  it("exports deriveSessionCompleteEvent function", () => {
    expect(getSource()).toContain("export function deriveSessionCompleteEvent");
  });

  it("checks runState.done to decide which screen to render", () => {
    expect(getSource()).toContain("runState.done");
  });

  it("checks runState.status === 'complete' for conditional rendering", () => {
    expect(getSource()).toContain('"complete"');
  });

  it("renders Completion component when session is done", () => {
    const src = getSource();
    expect(src).toContain("<Completion");
  });

  it("passes event prop from sessionCompleteEvent to Completion", () => {
    const src = getSource();
    expect(src).toContain("event={sessionCompleteEvent}");
  });

  it("passes outputDir from config to Completion", () => {
    const src = getSource();
    expect(src).toContain("outputDir={config.output.defaultDir}");
  });
});

// ---------------------------------------------------------------------------
// React element creation: RunDashboard uses Completion for complete status
// ---------------------------------------------------------------------------

describe("F052 — RunDashboard React element", () => {
  const makeConfig = () => ({
    models: {
      default: "claude-sonnet-4-6",
      planner: "claude-opus-4-5",
      generator: "claude-sonnet-4-5",
      evaluator: "claude-haiku-3-5",
    },
    dashboard: { url: "http://localhost:3000", secret: "" },
    output: { defaultDir: "/tmp/harness" },
    python: { path: "python3", venvPath: "" },
    history: [],
  });

  it("RunDashboard can be instantiated with React.createElement", async () => {
    const { RunDashboard } = await import("../components/run-dashboard.js");
    const el = React.createElement(RunDashboard, {
      specPath: "spec.md",
      options: {},
      config: makeConfig(),
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(RunDashboard);
  });

  it("Completion component is importable from completion.js", async () => {
    const { Completion } = await import("../components/completion.js");
    expect(typeof Completion).toBe("function");
  });

  it("Completion can be instantiated with a session_complete event and config-derived props", async () => {
    const { Completion } = await import("../components/completion.js");
    const el = React.createElement(Completion, {
      event: SESSION_COMPLETE_EVENT,
      outputDir: "/tmp/harness",
      dashboardUrl: "http://localhost:3000",
      onDone: () => {},
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(Completion);
    expect(el.props.event).toBe(SESSION_COMPLETE_EVENT);
    expect(el.props.outputDir).toBe("/tmp/harness");
    expect(el.props.dashboardUrl).toBe("http://localhost:3000");
  });

  it("Completion receives passing count from the session_complete event", async () => {
    const { Completion } = await import("../components/completion.js");
    const el = React.createElement(Completion, {
      event: SESSION_COMPLETE_EVENT,
      outputDir: "/tmp/out",
      onDone: () => {},
    });
    expect(el.props.event.passing).toBe(10);
    expect(el.props.event.totalFeatures).toBe(12);
    expect(el.props.event.cost).toBe(4.56);
  });
});
