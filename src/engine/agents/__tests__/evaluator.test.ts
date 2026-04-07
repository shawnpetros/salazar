import { describe, it, expect } from "vitest";
import { parseEvaluation, computeWeightedScore } from "../evaluator.js";

describe("parseEvaluation", () => {
  it("parses a valid JSON code block", () => {
    const text = "Here is my evaluation:\n```json\n{\"score\": 8.5, \"passed\": true}\n```";
    const result = parseEvaluation(text);
    expect(result).toEqual({ score: 8.5, passed: true });
  });

  it("parses a raw JSON object embedded in prose", () => {
    const text = 'The evaluation result is {"dimensionScores": {"specCompliance": 9}} and that is all.';
    const result = parseEvaluation(text);
    expect(result).toEqual({ dimensionScores: { specCompliance: 9 } });
  });

  it("returns null when no JSON is found", () => {
    const text = "No JSON here, just plain text.";
    expect(parseEvaluation(text)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    const text = "```json\n{broken json\n```";
    // Falls through to brace scan, which also fails to parse
    expect(parseEvaluation(text)).toBeNull();
  });

  it("prefers the ```json block over raw JSON", () => {
    const text = '{"raw": true}\n```json\n{"block": true}\n```';
    const result = parseEvaluation(text);
    // The ```json block should be found and returned
    expect(result).toEqual({ block: true });
  });

  it("handles nested objects in the JSON block", () => {
    const text =
      "```json\n" +
      '{"dimensionScores": {"specCompliance": 8, "codeQuality": 7, "security": 9, "usability": 6}, "issues": [], "recommendations": ["Add types"]}\n' +
      "```";
    const result = parseEvaluation(text);
    expect(result).not.toBeNull();
    expect(result!["dimensionScores"]).toEqual({
      specCompliance: 8,
      codeQuality: 7,
      security: 9,
      usability: 6,
    });
    expect(result!["recommendations"]).toEqual(["Add types"]);
  });

  it("handles empty string", () => {
    expect(parseEvaluation("")).toBeNull();
  });

  it("finds raw JSON when code block has invalid JSON but raw is valid", () => {
    const text = "```json\n{bad}\n```\nBut here is valid: {\"valid\": true}";
    const result = parseEvaluation(text);
    expect(result).toEqual({ valid: true });
  });
});

describe("computeWeightedScore", () => {
  it("computes the correct weighted score for perfect scores", () => {
    const score = computeWeightedScore({
      specCompliance: 10,
      codeQuality: 10,
      security: 10,
      usability: 10,
    });
    expect(score).toBe(10);
  });

  it("computes the correct weighted score for zero scores", () => {
    const score = computeWeightedScore({
      specCompliance: 0,
      codeQuality: 0,
      security: 0,
      usability: 0,
    });
    expect(score).toBe(0);
  });

  it("applies weights correctly (specCompliance=0.35, codeQuality=0.25, security=0.25, usability=0.15)", () => {
    // Only specCompliance = 10, others = 0 → 10 * 0.35 = 3.5
    expect(computeWeightedScore({ specCompliance: 10, codeQuality: 0, security: 0, usability: 0 })).toBe(3.5);
    // Only codeQuality = 10, others = 0 → 10 * 0.25 = 2.5
    expect(computeWeightedScore({ specCompliance: 0, codeQuality: 10, security: 0, usability: 0 })).toBe(2.5);
    // Only security = 10, others = 0 → 10 * 0.25 = 2.5
    expect(computeWeightedScore({ specCompliance: 0, codeQuality: 0, security: 10, usability: 0 })).toBe(2.5);
    // Only usability = 10, others = 0 → 10 * 0.15 = 1.5
    expect(computeWeightedScore({ specCompliance: 0, codeQuality: 0, security: 0, usability: 10 })).toBe(1.5);
  });

  it("rounds to 2 decimal places", () => {
    // 8 * 0.35 + 7 * 0.25 + 9 * 0.25 + 6 * 0.15
    // = 2.8 + 1.75 + 2.25 + 0.9 = 7.7
    const score = computeWeightedScore({
      specCompliance: 8,
      codeQuality: 7,
      security: 9,
      usability: 6,
    });
    expect(score).toBe(7.7);
  });

  it("treats missing dimensions as 0", () => {
    // Only specCompliance provided → 10 * 0.35 = 3.5
    const score = computeWeightedScore({ specCompliance: 10 });
    expect(score).toBe(3.5);
  });

  it("computes a passing threshold score (7.0)", () => {
    // To hit exactly 7.0: need 7.0/0.35+0.25+0.25+0.15 with equal scores
    // All dimensions = 7 → 7*1.0 = 7.0
    const score = computeWeightedScore({
      specCompliance: 7,
      codeQuality: 7,
      security: 7,
      usability: 7,
    });
    expect(score).toBe(7);
  });

  it("handles fractional input values", () => {
    // 7.5 * 0.35 + 8.0 * 0.25 + 7.0 * 0.25 + 6.0 * 0.15
    // = 2.625 + 2.0 + 1.75 + 0.9 = 7.275 → rounds to 7.28
    const score = computeWeightedScore({
      specCompliance: 7.5,
      codeQuality: 8,
      security: 7,
      usability: 6,
    });
    expect(score).toBe(7.28);
  });
});
