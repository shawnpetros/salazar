/**
 * F019 — Parse validator_result log line into HarnessEvent
 *
 * Verifies that parseLine() correctly parses
 * '[validators] <Name>: PASS' and '[validators] <Name>: FAIL'
 * log lines into { type: 'validator_result', name, passed } event objects.
 */

import { describe, it, expect } from "vitest";
import { parseLine } from "../lib/log-parser.js";

describe("F019 — parseLine: validator_result", () => {
  it("parses '[validators] TypeCheck: PASS' into a validator_result event with passed: true", () => {
    const event = parseLine("[validators] TypeCheck: PASS");
    expect(event).not.toBeNull();
    expect(event).toEqual({
      type: "validator_result",
      name: "TypeCheck",
      passed: true,
    });
  });

  it("parses '[validators] Lint: FAIL' into a validator_result event with passed: false", () => {
    const event = parseLine("[validators] Lint: FAIL");
    expect(event).not.toBeNull();
    expect(event?.type).toBe("validator_result");
    if (event?.type === "validator_result") {
      expect(event.passed).toBe(false);
    }
  });

  it("extracts the correct validator name", () => {
    const event = parseLine("[validators] TypeCheck: PASS");
    expect(event?.type).toBe("validator_result");
    if (event?.type === "validator_result") {
      expect(event.name).toBe("TypeCheck");
    }
  });

  it("extracts the correct validator name for FAIL", () => {
    const event = parseLine("[validators] Lint: FAIL");
    expect(event?.type).toBe("validator_result");
    if (event?.type === "validator_result") {
      expect(event.name).toBe("Lint");
    }
  });

  it("sets passed to true for PASS result", () => {
    const event = parseLine("[validators] Tests: PASS");
    expect(event?.type).toBe("validator_result");
    if (event?.type === "validator_result") {
      expect(event.passed).toBe(true);
    }
  });

  it("sets passed to false for FAIL result", () => {
    const event = parseLine("[validators] Build: FAIL");
    expect(event?.type).toBe("validator_result");
    if (event?.type === "validator_result") {
      expect(event.passed).toBe(false);
    }
  });

  it("returns null for an unrecognised log line", () => {
    expect(parseLine("[validators] TypeCheck: UNKNOWN")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseLine("")).toBeNull();
  });

  it("returns null for a line from a different prefix", () => {
    expect(parseLine("[orchestrator] TypeCheck: PASS")).toBeNull();
  });
});
