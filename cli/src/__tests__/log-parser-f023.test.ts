/**
 * F023 — Log parser returns null for unrecognized or empty lines
 *
 * Verifies that parseLine() returns null (without throwing) when given
 * a line that does not match any known harness log pattern, including
 * empty strings.
 */

import { describe, it, expect } from "vitest";
import { parseLine } from "../lib/log-parser.js";

describe("F023 — parseLine: null for unrecognized or empty lines", () => {
  it("returns null for a random log output string", () => {
    expect(parseLine("some random log output")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseLine("")).toBeNull();
  });

  it("does not throw for a random log output string", () => {
    expect(() => parseLine("some random log output")).not.toThrow();
  });

  it("does not throw for an empty string", () => {
    expect(() => parseLine("")).not.toThrow();
  });

  it("returns null for a line that is only whitespace", () => {
    expect(parseLine("   ")).toBeNull();
  });

  it("returns null for a line with a numeric value", () => {
    expect(parseLine("12345")).toBeNull();
  });

  it("returns null for a line that partially matches a known pattern", () => {
    expect(parseLine("[orchestrator] Unknown action")).toBeNull();
  });
});
