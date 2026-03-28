/**
 * F020 — Parse evaluator_result log line into HarnessEvent
 *
 * Verifies that parseLine() correctly parses
 * '[evaluator] Feature <ID> evaluation complete'
 * log lines into { type: 'evaluator_result', score: 0, dimensions: {}, feedback: '' }
 * event objects with defaults for unparsed fields.
 */

import { describe, it, expect } from "vitest";
import { parseLine } from "../lib/log-parser.js";

describe("F020 — parseLine: evaluator_result", () => {
  it("parses '[evaluator] Feature F003 evaluation complete' into an evaluator_result event", () => {
    const event = parseLine("[evaluator] Feature F003 evaluation complete");
    expect(event).not.toBeNull();
    expect(event).toEqual({
      type: "evaluator_result",
      score: 0,
      dimensions: {},
      feedback: "",
    });
  });

  it("returns type 'evaluator_result'", () => {
    const event = parseLine("[evaluator] Feature F003 evaluation complete");
    expect(event?.type).toBe("evaluator_result");
  });

  it("defaults score to 0 for unparsed fields", () => {
    const event = parseLine("[evaluator] Feature F003 evaluation complete");
    expect(event?.type).toBe("evaluator_result");
    if (event?.type === "evaluator_result") {
      expect(event.score).toBe(0);
    }
  });

  it("defaults dimensions to empty object for unparsed fields", () => {
    const event = parseLine("[evaluator] Feature F003 evaluation complete");
    expect(event?.type).toBe("evaluator_result");
    if (event?.type === "evaluator_result") {
      expect(event.dimensions).toEqual({});
    }
  });

  it("defaults feedback to empty string for unparsed fields", () => {
    const event = parseLine("[evaluator] Feature F003 evaluation complete");
    expect(event?.type).toBe("evaluator_result");
    if (event?.type === "evaluator_result") {
      expect(event.feedback).toBe("");
    }
  });

  it("parses a different feature ID (F001)", () => {
    const event = parseLine("[evaluator] Feature F001 evaluation complete");
    expect(event).not.toBeNull();
    expect(event?.type).toBe("evaluator_result");
  });

  it("returns null for an unrecognised evaluator line", () => {
    expect(parseLine("[evaluator] Something else happened")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseLine("")).toBeNull();
  });

  it("returns null for a line from a different prefix", () => {
    expect(
      parseLine("[orchestrator] Feature F003 evaluation complete")
    ).toBeNull();
  });
});
