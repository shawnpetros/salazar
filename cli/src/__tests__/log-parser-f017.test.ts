/**
 * F017 — Parse feature_start log line into HarnessEvent
 *
 * Verifies that parseLine() correctly parses the
 * '[orchestrator] Iteration N: feature F00X (done/total done)'
 * log line into a { type: 'feature_start', id, iteration, done, total, name } event object.
 */

import { describe, it, expect } from "vitest";
import { parseLine } from "../lib/log-parser.js";

describe("F017 — parseLine: feature_start", () => {
  it("parses '[orchestrator] Iteration 3: feature F003 (2/21 done)' into a feature_start event", () => {
    const event = parseLine(
      "[orchestrator] Iteration 3: feature F003 (2/21 done)"
    );
    expect(event).not.toBeNull();
    expect(event).toEqual({
      type: "feature_start",
      id: "F003",
      iteration: 3,
      done: 2,
      total: 21,
      name: "",
    });
  });

  it("extracts the correct feature id", () => {
    const event = parseLine(
      "[orchestrator] Iteration 1: feature F001 (0/10 done)"
    );
    expect(event?.type).toBe("feature_start");
    if (event?.type === "feature_start") {
      expect(event.id).toBe("F001");
    }
  });

  it("extracts the correct iteration number", () => {
    const event = parseLine(
      "[orchestrator] Iteration 5: feature F010 (4/10 done)"
    );
    expect(event?.type).toBe("feature_start");
    if (event?.type === "feature_start") {
      expect(event.iteration).toBe(5);
    }
  });

  it("extracts the correct done and total counts", () => {
    const event = parseLine(
      "[orchestrator] Iteration 2: feature F007 (6/63 done)"
    );
    expect(event?.type).toBe("feature_start");
    if (event?.type === "feature_start") {
      expect(event.done).toBe(6);
      expect(event.total).toBe(63);
    }
  });

  it("sets name to empty string", () => {
    const event = parseLine(
      "[orchestrator] Iteration 1: feature F001 (0/21 done)"
    );
    expect(event?.type).toBe("feature_start");
    if (event?.type === "feature_start") {
      expect(event.name).toBe("");
    }
  });

  it("returns null for an unrecognised log line", () => {
    const event = parseLine("[orchestrator] Some other event");
    expect(event).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseLine("")).toBeNull();
  });
});
