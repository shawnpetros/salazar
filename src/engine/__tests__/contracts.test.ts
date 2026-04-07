import { describe, it, expect } from "vitest";
import {
  FeatureListSchema,
  FeatureListLooseSchema,
  EvalOutputSchema,
  validateHandoff,
} from "../contracts.js";

describe("FeatureListSchema", () => {
  it("validates a correct feature list", () => {
    const data = {
      features: [
        { id: "F001", description: "Init", complexity: "setup", steps: ["Given...", "When..."], passes: false },
        { id: "F002", description: "Core", complexity: "moderate", steps: [], passes: false },
      ],
    };
    const result = FeatureListSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects empty features array", () => {
    const result = FeatureListSchema.safeParse({ features: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing complexity", () => {
    const result = FeatureListSchema.safeParse({
      features: [{ id: "F001", description: "x", steps: [], passes: false }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid complexity value", () => {
    const result = FeatureListSchema.safeParse({
      features: [{ id: "F001", description: "x", complexity: "extreme", steps: [], passes: false }],
    });
    expect(result.success).toBe(false);
  });

  it("defaults optional fields", () => {
    const result = FeatureListSchema.safeParse({
      features: [{ id: "F001", description: "x", complexity: "simple", steps: [] }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.features[0].passes).toBe(false);
      expect(result.data.features[0].category).toBe("general");
    }
  });
});

describe("FeatureListLooseSchema", () => {
  it("accepts wrapped format { features: [...] }", () => {
    const data = {
      features: [{ id: "F001", description: "x", complexity: "setup", steps: [] }],
    };
    const result = FeatureListLooseSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.features).toHaveLength(1);
    }
  });

  it("accepts bare array and normalizes to wrapped format", () => {
    const data = [{ id: "F001", description: "x", complexity: "setup", steps: [] }];
    const result = FeatureListLooseSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.features).toHaveLength(1);
    }
  });
});

describe("EvalOutputSchema", () => {
  it("validates a correct evaluation", () => {
    const data = {
      dimensionScores: { specCompliance: 8, codeQuality: 7, security: 9, usability: 6 },
      issues: [{ severity: "low", description: "Minor naming issue" }],
      recommendations: ["Use more descriptive names"],
    };
    const result = EvalOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("defaults issues and recommendations to empty arrays", () => {
    const data = {
      dimensionScores: { specCompliance: 8, codeQuality: 7, security: 9, usability: 6 },
    };
    const result = EvalOutputSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.issues).toEqual([]);
      expect(result.data.recommendations).toEqual([]);
    }
  });

  it("rejects scores outside 0-10 range", () => {
    const data = {
      dimensionScores: { specCompliance: 11, codeQuality: 7, security: 9, usability: 6 },
    };
    const result = EvalOutputSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects missing dimension scores", () => {
    const data = {
      dimensionScores: { specCompliance: 8, codeQuality: 7 },
    };
    const result = EvalOutputSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("validateHandoff", () => {
  it("returns valid with data on success", () => {
    const result = validateHandoff(EvalOutputSchema, {
      dimensionScores: { specCompliance: 8, codeQuality: 7, security: 9, usability: 6 },
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.dimensionScores.specCompliance).toBe(8);
    }
  });

  it("returns invalid with readable error on failure", () => {
    const result = validateHandoff(EvalOutputSchema, { dimensionScores: {} });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Schema validation failed");
      expect(result.error).toContain("specCompliance");
    }
  });
});
