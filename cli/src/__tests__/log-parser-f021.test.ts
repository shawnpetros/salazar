/**
 * F021 — Parse session_complete log line into HarnessEvent
 *
 * Verifies that parseLine() correctly parses
 * '[orchestrator] Session <id> finished in <N>s'
 * log lines into { type: 'session_complete', totalFeatures: 0, passing: 0, durationMs: N*1000, cost: 0 }
 * event objects with defaults for unparsed fields.
 */

import { describe, it, expect } from "vitest";
import { parseLine } from "../lib/log-parser.js";

describe("F021 — parseLine: session_complete", () => {
  it("parses '[orchestrator] Session abc123 finished in 4200s' into a session_complete event", () => {
    const event = parseLine("[orchestrator] Session abc123 finished in 4200s");
    expect(event).not.toBeNull();
    expect(event).toEqual({
      type: "session_complete",
      totalFeatures: 0,
      passing: 0,
      durationMs: 4200000,
      cost: 0,
    });
  });

  it("returns type 'session_complete'", () => {
    const event = parseLine("[orchestrator] Session abc123 finished in 4200s");
    expect(event?.type).toBe("session_complete");
  });

  it("converts seconds to milliseconds correctly", () => {
    const event = parseLine("[orchestrator] Session xyz finished in 60s");
    expect(event?.type).toBe("session_complete");
    if (event?.type === "session_complete") {
      expect(event.durationMs).toBe(60000);
    }
  });

  it("defaults totalFeatures to 0", () => {
    const event = parseLine("[orchestrator] Session abc123 finished in 4200s");
    expect(event?.type).toBe("session_complete");
    if (event?.type === "session_complete") {
      expect(event.totalFeatures).toBe(0);
    }
  });

  it("defaults passing to 0", () => {
    const event = parseLine("[orchestrator] Session abc123 finished in 4200s");
    expect(event?.type).toBe("session_complete");
    if (event?.type === "session_complete") {
      expect(event.passing).toBe(0);
    }
  });

  it("defaults cost to 0", () => {
    const event = parseLine("[orchestrator] Session abc123 finished in 4200s");
    expect(event?.type).toBe("session_complete");
    if (event?.type === "session_complete") {
      expect(event.cost).toBe(0);
    }
  });

  it("parses a different session id", () => {
    const event = parseLine("[orchestrator] Session session-99 finished in 100s");
    expect(event).not.toBeNull();
    expect(event?.type).toBe("session_complete");
    if (event?.type === "session_complete") {
      expect(event.durationMs).toBe(100000);
    }
  });

  it("returns null for an unrecognised orchestrator line", () => {
    expect(parseLine("[orchestrator] Session abc123 failed")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseLine("")).toBeNull();
  });

  it("returns null for a line from a different prefix", () => {
    expect(
      parseLine("[other] Session abc123 finished in 4200s")
    ).toBeNull();
  });
});
