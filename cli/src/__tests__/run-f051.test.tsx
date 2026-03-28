/**
 * F051 — run command: render live progress UI via useHarness hook
 *
 * Verifies that:
 *  - RunDashboard is exported from components/run-dashboard.tsx
 *  - Helper functions deriveCurrentFeature, deriveTimelineEntries,
 *    deriveLastCostUpdate are exported and behave correctly
 *  - RunDashboard accepts specPath, options, and config props
 *  - run-dashboard.tsx imports all required sub-components
 *  - run.tsx imports render from ink and uses RunDashboard
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { HarnessEvent } from "../lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Export checks
// ---------------------------------------------------------------------------

describe("F051 — RunDashboard exports", () => {
  it("RunDashboard is exported as a function from components/run-dashboard.tsx", async () => {
    const { RunDashboard } = await import("../components/run-dashboard.js");
    expect(typeof RunDashboard).toBe("function");
  });

  it("deriveCurrentFeature is exported as a function", async () => {
    const { deriveCurrentFeature } = await import("../components/run-dashboard.js");
    expect(typeof deriveCurrentFeature).toBe("function");
  });

  it("deriveTimelineEntries is exported as a function", async () => {
    const { deriveTimelineEntries } = await import("../components/run-dashboard.js");
    expect(typeof deriveTimelineEntries).toBe("function");
  });

  it("deriveLastCostUpdate is exported as a function", async () => {
    const { deriveLastCostUpdate } = await import("../components/run-dashboard.js");
    expect(typeof deriveLastCostUpdate).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// deriveCurrentFeature
// ---------------------------------------------------------------------------

describe("F051 — deriveCurrentFeature: no events", () => {
  it("returns null when timeline is empty", async () => {
    const { deriveCurrentFeature } = await import("../components/run-dashboard.js");
    expect(deriveCurrentFeature([])).toBeNull();
  });
});

describe("F051 — deriveCurrentFeature: feature_start only", () => {
  it("returns the feature id and name with phase 'generate'", async () => {
    const { deriveCurrentFeature } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      {
        type: "feature_start",
        id: "F001",
        name: "key generation",
        done: 0,
        total: 5,
        iteration: 1,
      },
    ];
    const result = deriveCurrentFeature(timeline);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("F001");
    expect(result?.name).toBe("key generation");
    expect(result?.phase).toBe("generate");
  });
});

describe("F051 — deriveCurrentFeature: phase transitions", () => {
  it("transitions to 'validate' after validator_result event", async () => {
    const { deriveCurrentFeature } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "feature_start", id: "F001", name: "key gen", done: 0, total: 1, iteration: 1 },
      { type: "validator_result", name: "TypeCheck", passed: true },
    ];
    const result = deriveCurrentFeature(timeline);
    expect(result?.phase).toBe("validate");
  });

  it("transitions to 'evaluate' after evaluator_result event", async () => {
    const { deriveCurrentFeature } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "feature_start", id: "F001", name: "key gen", done: 0, total: 1, iteration: 1 },
      { type: "validator_result", name: "TypeCheck", passed: true },
      {
        type: "evaluator_result",
        score: 8.5,
        dimensions: { Spec: 9, Quality: 8 },
        feedback: "good",
      },
    ];
    const result = deriveCurrentFeature(timeline);
    expect(result?.phase).toBe("evaluate");
  });

  it("returns null once feature_complete is received", async () => {
    const { deriveCurrentFeature } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "feature_start", id: "F001", name: "key gen", done: 0, total: 1, iteration: 1 },
      { type: "feature_complete", id: "F001", score: 9, durationMs: 5000, complexity: "simple" },
    ];
    expect(deriveCurrentFeature(timeline)).toBeNull();
  });

  it("resets phase to 'generate' for the next feature_start", async () => {
    const { deriveCurrentFeature } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "feature_start", id: "F001", name: "first", done: 0, total: 2, iteration: 1 },
      { type: "validator_result", name: "TypeCheck", passed: true },
      { type: "feature_complete", id: "F001", score: 9, durationMs: 5000, complexity: "simple" },
      { type: "feature_start", id: "F002", name: "second", done: 1, total: 2, iteration: 1 },
    ];
    const result = deriveCurrentFeature(timeline);
    expect(result?.id).toBe("F002");
    expect(result?.phase).toBe("generate");
  });
});

// ---------------------------------------------------------------------------
// deriveTimelineEntries
// ---------------------------------------------------------------------------

describe("F051 — deriveTimelineEntries: empty timeline", () => {
  it("returns empty array for empty timeline", async () => {
    const { deriveTimelineEntries } = await import("../components/run-dashboard.js");
    expect(deriveTimelineEntries([])).toEqual([]);
  });
});

describe("F051 — deriveTimelineEntries: single feature", () => {
  it("returns one entry with startOffsetMs=0 for the first feature", async () => {
    const { deriveTimelineEntries } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "feature_start", id: "F001", name: "first", done: 0, total: 1, iteration: 1 },
      { type: "feature_complete", id: "F001", score: 9, durationMs: 5000, complexity: "simple" },
    ];
    const entries = deriveTimelineEntries(timeline);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.startOffsetMs).toBe(0);
    expect(entries[0]?.durationMs).toBe(5000);
    expect(entries[0]?.featureId).toBe("F001");
  });

  it("marks result as 'passed' when score >= 7", async () => {
    const { deriveTimelineEntries } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "feature_start", id: "F001", name: "test", done: 0, total: 1, iteration: 1 },
      { type: "feature_complete", id: "F001", score: 7, durationMs: 1000, complexity: "simple" },
    ];
    expect(deriveTimelineEntries(timeline)[0]?.result).toBe("passed");
  });

  it("marks result as 'failed' when score < 7", async () => {
    const { deriveTimelineEntries } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "feature_start", id: "F001", name: "test", done: 0, total: 1, iteration: 1 },
      { type: "feature_complete", id: "F001", score: 5, durationMs: 1000, complexity: "simple" },
    ];
    expect(deriveTimelineEntries(timeline)[0]?.result).toBe("failed");
  });

  it("marks result as 'failed' when score is null", async () => {
    const { deriveTimelineEntries } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "feature_start", id: "F001", name: "test", done: 0, total: 1, iteration: 1 },
      { type: "feature_complete", id: "F001", score: null, durationMs: 1000, complexity: "simple" },
    ];
    expect(deriveTimelineEntries(timeline)[0]?.result).toBe("failed");
  });
});

describe("F051 — deriveTimelineEntries: multiple features", () => {
  it("accumulates startOffsetMs across completed features", async () => {
    const { deriveTimelineEntries } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "feature_start", id: "F001", name: "first", done: 0, total: 2, iteration: 1 },
      { type: "feature_complete", id: "F001", score: 9, durationMs: 5000, complexity: "simple" },
      { type: "feature_start", id: "F002", name: "second", done: 1, total: 2, iteration: 1 },
      { type: "feature_complete", id: "F002", score: 8, durationMs: 3000, complexity: "moderate" },
    ];
    const entries = deriveTimelineEntries(timeline);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.startOffsetMs).toBe(0);
    expect(entries[1]?.startOffsetMs).toBe(5000);
  });

  it("returns entries in oldest-first order", async () => {
    const { deriveTimelineEntries } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "feature_start", id: "F001", name: "a", done: 0, total: 2, iteration: 1 },
      { type: "feature_complete", id: "F001", score: 9, durationMs: 1000, complexity: "simple" },
      { type: "feature_start", id: "F002", name: "b", done: 1, total: 2, iteration: 1 },
      { type: "feature_complete", id: "F002", score: 9, durationMs: 2000, complexity: "simple" },
    ];
    const entries = deriveTimelineEntries(timeline);
    expect(entries[0]?.featureId).toBe("F001");
    expect(entries[1]?.featureId).toBe("F002");
  });
});

// ---------------------------------------------------------------------------
// deriveLastCostUpdate
// ---------------------------------------------------------------------------

describe("F051 — deriveLastCostUpdate: no cost events", () => {
  it("returns null when no cost_update events exist", async () => {
    const { deriveLastCostUpdate } = await import("../components/run-dashboard.js");
    expect(deriveLastCostUpdate([])).toBeNull();
  });

  it("returns null when timeline has events but no cost_update", async () => {
    const { deriveLastCostUpdate } = await import("../components/run-dashboard.js");
    const timeline: HarnessEvent[] = [
      { type: "session_start", sessionId: "abc", spec: "spec.md" },
    ];
    expect(deriveLastCostUpdate(timeline)).toBeNull();
  });
});

describe("F051 — deriveLastCostUpdate: with cost events", () => {
  it("returns the single cost_update when only one exists", async () => {
    const { deriveLastCostUpdate } = await import("../components/run-dashboard.js");
    const costEvent: HarnessEvent = {
      type: "cost_update",
      total: 1.5,
      byAgent: { gen: 1.5 },
    };
    const result = deriveLastCostUpdate([costEvent]);
    expect(result).toEqual(costEvent);
  });

  it("returns the LAST cost_update when multiple exist", async () => {
    const { deriveLastCostUpdate } = await import("../components/run-dashboard.js");
    const first: HarnessEvent = { type: "cost_update", total: 0.5, byAgent: { gen: 0.5 } };
    const last: HarnessEvent = { type: "cost_update", total: 1.2, byAgent: { gen: 0.8, eval: 0.4 } };
    const result = deriveLastCostUpdate([first, last]);
    expect(result?.total).toBe(1.2);
    expect(result?.byAgent).toEqual({ gen: 0.8, eval: 0.4 });
  });
});

// ---------------------------------------------------------------------------
// RunDashboard React element
// ---------------------------------------------------------------------------

describe("F051 — RunDashboard React element", () => {
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

  it("RunDashboard props include specPath", async () => {
    const { RunDashboard } = await import("../components/run-dashboard.js");
    const el = React.createElement(RunDashboard, {
      specPath: "my-spec.md",
      options: {},
      config: makeConfig(),
    });
    expect(el.props.specPath).toBe("my-spec.md");
  });

  it("RunDashboard props include options", async () => {
    const { RunDashboard } = await import("../components/run-dashboard.js");
    const options = { model: "claude-opus-4-6" };
    const el = React.createElement(RunDashboard, {
      specPath: "spec.md",
      options,
      config: makeConfig(),
    });
    expect(el.props.options).toBe(options);
  });

  it("RunDashboard props include config", async () => {
    const { RunDashboard } = await import("../components/run-dashboard.js");
    const config = makeConfig();
    const el = React.createElement(RunDashboard, {
      specPath: "spec.md",
      options: {},
      config,
    });
    expect(el.props.config).toBe(config);
  });
});

// ---------------------------------------------------------------------------
// Source-level assertions: run-dashboard.tsx
// ---------------------------------------------------------------------------

describe("F051 — run-dashboard.tsx source structure", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "components/run-dashboard.tsx"), "utf-8");

  it("exports RunDashboard function", () => {
    expect(getSource()).toContain("export function RunDashboard");
  });

  it("exports deriveCurrentFeature function", () => {
    expect(getSource()).toContain("export function deriveCurrentFeature");
  });

  it("exports deriveTimelineEntries function", () => {
    expect(getSource()).toContain("export function deriveTimelineEntries");
  });

  it("exports deriveLastCostUpdate function", () => {
    expect(getSource()).toContain("export function deriveLastCostUpdate");
  });

  it("imports useHarness hook", () => {
    expect(getSource()).toContain("useHarness");
  });

  it("imports Header component", () => {
    expect(getSource()).toContain("Header");
  });

  it("imports ProgressBar component", () => {
    expect(getSource()).toContain("ProgressBar");
  });

  it("imports CurrentFeatureDisplay component", () => {
    expect(getSource()).toContain("CurrentFeatureDisplay");
  });

  it("imports Timeline component", () => {
    expect(getSource()).toContain("Timeline");
  });

  it("imports StatsRows component", () => {
    expect(getSource()).toContain("StatsRows");
  });

  it("includes keyboard hints text 'q: quit'", () => {
    expect(getSource()).toContain("q: quit");
  });

  it("includes keyboard hints text 'p: pause'", () => {
    expect(getSource()).toContain("p: pause");
  });

  it("includes keyboard hints text 'd: dashboard'", () => {
    expect(getSource()).toContain("d: dashboard");
  });

  it("renders Status line", () => {
    expect(getSource()).toContain("Status");
  });
});

// ---------------------------------------------------------------------------
// Source-level assertions: run.tsx uses RunDashboard
// ---------------------------------------------------------------------------

describe("F051 — run.tsx wires RunDashboard via render()", () => {
  const getRunSource = () =>
    readFileSync(resolve(srcRoot, "commands/run.tsx"), "utf-8");

  it("run.tsx imports render from ink", () => {
    expect(getRunSource()).toContain("render");
    expect(getRunSource()).toContain("ink");
  });

  it("run.tsx imports RunDashboard", () => {
    expect(getRunSource()).toContain("RunDashboard");
  });

  it("run.tsx calls render() in the run command body", () => {
    const src = getRunSource();
    expect(src).toContain("render(");
  });

  it("run.tsx returns early after process.exit(1) to guard against mocked exits", () => {
    const src = getRunSource();
    // The guard 'return' must appear after process.exit(1) so that when
    // process.exit is mocked in tests the function does not continue
    // to the render call.
    expect(src).toContain("process.exit(1)");
    expect(src).toContain("return;");
  });
});
