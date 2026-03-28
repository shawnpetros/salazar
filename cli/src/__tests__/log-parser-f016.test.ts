/**
 * F016 — Parse planner_complete log line into HarnessEvent
 *
 * Verifies that parseLine() correctly parses the
 * '[orchestrator] Planner created <N> features' log line into a
 * { type: 'planner_complete', features: N, durationMs: 0 } event object.
 */

import { describe, it, expect } from "vitest";
import { parseLine } from "../lib/log-parser.js";

describe("F016 — parseLine: planner_complete", () => {
  it("parses '[orchestrator] Planner created 21 features' into a planner_complete event", () => {
    const event = parseLine("[orchestrator] Planner created 21 features");
    expect(event).not.toBeNull();
    expect(event?.type).toBe("planner_complete");
    if (event?.type === "planner_complete") {
      expect(event.features).toBe(21);
      expect(event.durationMs).toBe(0);
    }
  });

  it("returns { type: 'planner_complete', features: 21, durationMs: 0 } exactly", () => {
    const event = parseLine("[orchestrator] Planner created 21 features");
    expect(event).toEqual({ type: "planner_complete", features: 21, durationMs: 0 });
  });

  it("correctly parses different feature counts", () => {
    const event = parseLine("[orchestrator] Planner created 63 features");
    expect(event).not.toBeNull();
    expect(event?.type).toBe("planner_complete");
    if (event?.type === "planner_complete") {
      expect(event.features).toBe(63);
      expect(event.durationMs).toBe(0);
    }
  });

  it("returns null for an unrecognised log line", () => {
    const event = parseLine("[orchestrator] Planner did something else");
    expect(event).toBeNull();
  });
});
