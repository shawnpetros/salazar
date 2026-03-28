/**
 * F018 — Parse feature_complete (PASSED) log line into HarnessEvent
 *
 * Verifies that parseLine() correctly parses the
 * '[orchestrator] Feature F003 PASSED'
 * log line into a { type: 'feature_complete', id, score, durationMs, complexity } event object.
 */

import { describe, it, expect } from "vitest";
import { parseLine } from "../lib/log-parser.js";

describe("F018 — parseLine: feature_complete (PASSED)", () => {
  it("parses '[orchestrator] Feature F003 PASSED' into a feature_complete event", () => {
    const event = parseLine("[orchestrator] Feature F003 PASSED");
    expect(event).not.toBeNull();
    expect(event).toEqual({
      type: "feature_complete",
      id: "F003",
      score: null,
      durationMs: 0,
      complexity: "",
    });
  });

  it("extracts the correct feature id", () => {
    const event = parseLine("[orchestrator] Feature F017 PASSED");
    expect(event?.type).toBe("feature_complete");
    if (event?.type === "feature_complete") {
      expect(event.id).toBe("F017");
    }
  });

  it("sets score to null", () => {
    const event = parseLine("[orchestrator] Feature F001 PASSED");
    expect(event?.type).toBe("feature_complete");
    if (event?.type === "feature_complete") {
      expect(event.score).toBeNull();
    }
  });

  it("sets durationMs to 0", () => {
    const event = parseLine("[orchestrator] Feature F001 PASSED");
    expect(event?.type).toBe("feature_complete");
    if (event?.type === "feature_complete") {
      expect(event.durationMs).toBe(0);
    }
  });

  it("sets complexity to empty string", () => {
    const event = parseLine("[orchestrator] Feature F001 PASSED");
    expect(event?.type).toBe("feature_complete");
    if (event?.type === "feature_complete") {
      expect(event.complexity).toBe("");
    }
  });

  it("returns null for an unrecognised log line", () => {
    const event = parseLine("[orchestrator] Feature F003 FAILED");
    expect(event).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseLine("")).toBeNull();
  });
});
