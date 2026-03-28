/**
 * F022 — Parse session_error log line into HarnessEvent
 *
 * Verifies that parseLine() correctly parses
 * '[orchestrator] Fatal error: <message>'
 * log lines into { type: 'session_error', error: '<message>' } event objects.
 */

import { describe, it, expect } from "vitest";
import { parseLine } from "../lib/log-parser.js";

describe("F022 — parseLine: session_error", () => {
  it("parses '[orchestrator] Fatal error: out of memory' into a session_error event", () => {
    const event = parseLine("[orchestrator] Fatal error: out of memory");
    expect(event).not.toBeNull();
    expect(event).toEqual({
      type: "session_error",
      error: "out of memory",
    });
  });

  it("returns type 'session_error'", () => {
    const event = parseLine("[orchestrator] Fatal error: out of memory");
    expect(event?.type).toBe("session_error");
  });

  it("captures the error message correctly", () => {
    const event = parseLine("[orchestrator] Fatal error: disk full");
    expect(event?.type).toBe("session_error");
    if (event?.type === "session_error") {
      expect(event.error).toBe("disk full");
    }
  });

  it("captures a multi-word error message", () => {
    const event = parseLine(
      "[orchestrator] Fatal error: connection to database lost"
    );
    expect(event?.type).toBe("session_error");
    if (event?.type === "session_error") {
      expect(event.error).toBe("connection to database lost");
    }
  });

  it("returns null for an unrecognised orchestrator line", () => {
    expect(parseLine("[orchestrator] Error: out of memory")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseLine("")).toBeNull();
  });

  it("returns null for a line from a different prefix", () => {
    expect(
      parseLine("[other] Fatal error: out of memory")
    ).toBeNull();
  });
});
