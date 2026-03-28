/**
 * F015 — Parse session_start log line into HarnessEvent
 *
 * Verifies that parseLine() correctly parses the '[orchestrator] Starting session <id>'
 * log line into a { type: 'session_start', sessionId, spec } event object.
 */

import { describe, it, expect } from "vitest";
import { parseLine } from "../lib/log-parser.js";

describe("F015 — parseLine: session_start", () => {
  it("parses '[orchestrator] Starting session abc123' into a session_start event", () => {
    const event = parseLine("[orchestrator] Starting session abc123");
    expect(event).not.toBeNull();
    expect(event?.type).toBe("session_start");
    if (event?.type === "session_start") {
      expect(event.sessionId).toBe("abc123");
      expect(event.spec).toBe("");
    }
  });

  it("captures the sessionId correctly from the log line", () => {
    const event = parseLine("[orchestrator] Starting session xyz789");
    expect(event).not.toBeNull();
    expect(event?.type).toBe("session_start");
    if (event?.type === "session_start") {
      expect(event.sessionId).toBe("xyz789");
    }
  });

  it("sets spec to empty string when not present in the log line", () => {
    const event = parseLine("[orchestrator] Starting session abc123");
    expect(event?.type === "session_start" && event.spec).toBe("");
  });

  it("returns null for an unrecognised log line", () => {
    const event = parseLine("[orchestrator] Some unknown event");
    expect(event).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseLine("")).toBeNull();
  });
});
