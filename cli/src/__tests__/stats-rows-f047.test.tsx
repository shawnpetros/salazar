/**
 * F047 — Evaluator score and cost display rows
 *
 * BDD scenario:
 *  Given lastEvaluator = { score: 8.5, dimensions: { Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0 } }
 *  and cost = { total: 1.42, byAgent: { plan: X, gen: Y, eval: Z } }
 *  When the run view renders
 *  Then it displays 'Last evaluator: 8.5/10 (Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0)'
 *  and 'Cost: $1.42 (plan: $X, gen: $Y, eval: $Z)'
 *
 * Verifies that:
 *  - StatsRows is exported as a function from components/stats-rows.tsx
 *  - StatsRowsProps interface is exported
 *  - renderEvaluatorRow is exported and formats correctly
 *  - renderCostRow is exported and formats correctly
 *  - formatScore is exported and formats to 1 decimal
 *  - formatCost is exported and formats to 2 decimals with $ prefix
 *  - renderEvaluatorRow returns the canonical BDD example string
 *  - renderCostRow returns the canonical cost format string
 *  - StatsRows accepts lastEvaluator and costUpdate props
 *  - StatsRows returns a React element
 *  - evaluator row is not rendered when lastEvaluator is null
 *  - cost row is not rendered when costUpdate is null
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EvaluatorResultEvent, CostUpdateEvent } from "../lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EVALUATOR: EvaluatorResultEvent = {
  type: "evaluator_result",
  score: 8.5,
  dimensions: { Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0 },
  feedback: "",
};

const COST_UPDATE: CostUpdateEvent = {
  type: "cost_update",
  total: 1.42,
  byAgent: { plan: 0.50, gen: 0.72, eval: 0.20 },
};

// ---------------------------------------------------------------------------
// Export checks
// ---------------------------------------------------------------------------

describe("F047 — StatsRows exports", () => {
  it("StatsRows is exported as a function from components/stats-rows.tsx", async () => {
    const { StatsRows } = await import("../components/stats-rows.js");
    expect(typeof StatsRows).toBe("function");
  });

  it("renderEvaluatorRow is exported as a function", async () => {
    const { renderEvaluatorRow } = await import("../components/stats-rows.js");
    expect(typeof renderEvaluatorRow).toBe("function");
  });

  it("renderCostRow is exported as a function", async () => {
    const { renderCostRow } = await import("../components/stats-rows.js");
    expect(typeof renderCostRow).toBe("function");
  });

  it("formatScore is exported as a function", async () => {
    const { formatScore } = await import("../components/stats-rows.js");
    expect(typeof formatScore).toBe("function");
  });

  it("formatCost is exported as a function", async () => {
    const { formatCost } = await import("../components/stats-rows.js");
    expect(typeof formatCost).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// formatScore
// ---------------------------------------------------------------------------

describe("F047 — formatScore", () => {
  it("formats 8.5 as '8.5'", async () => {
    const { formatScore } = await import("../components/stats-rows.js");
    expect(formatScore(8.5)).toBe("8.5");
  });

  it("formats 9 as '9.0'", async () => {
    const { formatScore } = await import("../components/stats-rows.js");
    expect(formatScore(9)).toBe("9.0");
  });

  it("formats 9.0 as '9.0'", async () => {
    const { formatScore } = await import("../components/stats-rows.js");
    expect(formatScore(9.0)).toBe("9.0");
  });

  it("formats 8.0 as '8.0'", async () => {
    const { formatScore } = await import("../components/stats-rows.js");
    expect(formatScore(8.0)).toBe("8.0");
  });

  it("formats 10 as '10.0'", async () => {
    const { formatScore } = await import("../components/stats-rows.js");
    expect(formatScore(10)).toBe("10.0");
  });

  it("formats 0 as '0.0'", async () => {
    const { formatScore } = await import("../components/stats-rows.js");
    expect(formatScore(0)).toBe("0.0");
  });
});

// ---------------------------------------------------------------------------
// formatCost
// ---------------------------------------------------------------------------

describe("F047 — formatCost", () => {
  it("formats 1.42 as '$1.42'", async () => {
    const { formatCost } = await import("../components/stats-rows.js");
    expect(formatCost(1.42)).toBe("$1.42");
  });

  it("formats 0.5 as '$0.50'", async () => {
    const { formatCost } = await import("../components/stats-rows.js");
    expect(formatCost(0.5)).toBe("$0.50");
  });

  it("formats 0 as '$0.00'", async () => {
    const { formatCost } = await import("../components/stats-rows.js");
    expect(formatCost(0)).toBe("$0.00");
  });

  it("formats 10 as '$10.00'", async () => {
    const { formatCost } = await import("../components/stats-rows.js");
    expect(formatCost(10)).toBe("$10.00");
  });

  it("starts with a dollar sign", async () => {
    const { formatCost } = await import("../components/stats-rows.js");
    expect(formatCost(1.42)).toMatch(/^\$/);
  });
});

// ---------------------------------------------------------------------------
// renderEvaluatorRow
// ---------------------------------------------------------------------------

describe("F047 — renderEvaluatorRow", () => {
  it("returns the canonical BDD example string", async () => {
    const { renderEvaluatorRow } = await import("../components/stats-rows.js");
    expect(renderEvaluatorRow(EVALUATOR)).toBe(
      "Last evaluator: 8.5/10 (Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0)"
    );
  });

  it("starts with 'Last evaluator: '", async () => {
    const { renderEvaluatorRow } = await import("../components/stats-rows.js");
    expect(renderEvaluatorRow(EVALUATOR)).toMatch(/^Last evaluator: /);
  });

  it("contains the score followed by /10", async () => {
    const { renderEvaluatorRow } = await import("../components/stats-rows.js");
    expect(renderEvaluatorRow(EVALUATOR)).toContain("8.5/10");
  });

  it("contains each dimension name", async () => {
    const { renderEvaluatorRow } = await import("../components/stats-rows.js");
    const result = renderEvaluatorRow(EVALUATOR);
    expect(result).toContain("Spec");
    expect(result).toContain("Quality");
    expect(result).toContain("Security");
    expect(result).toContain("UX");
  });

  it("contains each dimension value formatted to 1 decimal", async () => {
    const { renderEvaluatorRow } = await import("../components/stats-rows.js");
    const result = renderEvaluatorRow(EVALUATOR);
    expect(result).toContain("9.0");
    expect(result).toContain("8.0");
    expect(result).toContain("8.5");
  });

  it("wraps dimensions in parentheses", async () => {
    const { renderEvaluatorRow } = await import("../components/stats-rows.js");
    const result = renderEvaluatorRow(EVALUATOR);
    expect(result).toMatch(/\(.*\)$/);
  });

  it("formats 10 score as '10.0/10'", async () => {
    const { renderEvaluatorRow } = await import("../components/stats-rows.js");
    const ev: EvaluatorResultEvent = {
      type: "evaluator_result",
      score: 10,
      dimensions: {},
      feedback: "",
    };
    expect(renderEvaluatorRow(ev)).toContain("10.0/10");
  });

  it("handles empty dimensions gracefully", async () => {
    const { renderEvaluatorRow } = await import("../components/stats-rows.js");
    const ev: EvaluatorResultEvent = {
      type: "evaluator_result",
      score: 7.5,
      dimensions: {},
      feedback: "",
    };
    expect(renderEvaluatorRow(ev)).toBe("Last evaluator: 7.5/10 ()");
  });
});

// ---------------------------------------------------------------------------
// renderCostRow
// ---------------------------------------------------------------------------

describe("F047 — renderCostRow", () => {
  it("starts with 'Cost: '", async () => {
    const { renderCostRow } = await import("../components/stats-rows.js");
    expect(renderCostRow(COST_UPDATE)).toMatch(/^Cost: /);
  });

  it("contains the total cost formatted as a dollar amount", async () => {
    const { renderCostRow } = await import("../components/stats-rows.js");
    expect(renderCostRow(COST_UPDATE)).toContain("$1.42");
  });

  it("contains agent names in the breakdown", async () => {
    const { renderCostRow } = await import("../components/stats-rows.js");
    const result = renderCostRow(COST_UPDATE);
    expect(result).toContain("plan");
    expect(result).toContain("gen");
    expect(result).toContain("eval");
  });

  it("contains agent costs formatted with dollar signs", async () => {
    const { renderCostRow } = await import("../components/stats-rows.js");
    const result = renderCostRow(COST_UPDATE);
    expect(result).toContain("$0.50");
    expect(result).toContain("$0.72");
    expect(result).toContain("$0.20");
  });

  it("wraps agent breakdown in parentheses", async () => {
    const { renderCostRow } = await import("../components/stats-rows.js");
    const result = renderCostRow(COST_UPDATE);
    expect(result).toMatch(/\(.*\)$/);
  });

  it("formats cost with two decimal places", async () => {
    const { renderCostRow } = await import("../components/stats-rows.js");
    const cu: CostUpdateEvent = {
      type: "cost_update",
      total: 2,
      byAgent: { plan: 1 },
    };
    expect(renderCostRow(cu)).toContain("$2.00");
    expect(renderCostRow(cu)).toContain("$1.00");
  });

  it("handles empty byAgent gracefully", async () => {
    const { renderCostRow } = await import("../components/stats-rows.js");
    const cu: CostUpdateEvent = {
      type: "cost_update",
      total: 0,
      byAgent: {},
    };
    expect(renderCostRow(cu)).toBe("Cost: $0.00 ()");
  });
});

// ---------------------------------------------------------------------------
// React element checks
// ---------------------------------------------------------------------------

describe("F047 — StatsRows React element", () => {
  it("returns a React element when called directly with both props", async () => {
    const { StatsRows } = await import("../components/stats-rows.js");
    const el = StatsRows({ lastEvaluator: EVALUATOR, costUpdate: COST_UPDATE });
    expect(el).toBeDefined();
    expect(typeof el).toBe("object");
  });

  it("React.createElement works with StatsRows", async () => {
    const { StatsRows } = await import("../components/stats-rows.js");
    const el = React.createElement(StatsRows, {
      lastEvaluator: EVALUATOR,
      costUpdate: COST_UPDATE,
    });
    expect(el.type).toBe(StatsRows);
    expect(el.props.lastEvaluator).toBe(EVALUATOR);
    expect(el.props.costUpdate).toBe(COST_UPDATE);
  });

  it("accepts null lastEvaluator", async () => {
    const { StatsRows } = await import("../components/stats-rows.js");
    const el = React.createElement(StatsRows, {
      lastEvaluator: null,
      costUpdate: COST_UPDATE,
    });
    expect(el.props.lastEvaluator).toBeNull();
  });

  it("accepts null costUpdate", async () => {
    const { StatsRows } = await import("../components/stats-rows.js");
    const el = React.createElement(StatsRows, {
      lastEvaluator: EVALUATOR,
      costUpdate: null,
    });
    expect(el.props.costUpdate).toBeNull();
  });

  it("accepts both null props", async () => {
    const { StatsRows } = await import("../components/stats-rows.js");
    const el = StatsRows({ lastEvaluator: null, costUpdate: null });
    expect(el).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Source-level assertions
// ---------------------------------------------------------------------------

describe("F047 — stats-rows.tsx source structure", () => {
  it("exports StatsRows function", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/stats-rows.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function StatsRows");
  });

  it("exports renderEvaluatorRow function", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/stats-rows.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function renderEvaluatorRow");
  });

  it("exports renderCostRow function", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/stats-rows.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function renderCostRow");
  });

  it("exports formatScore function", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/stats-rows.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function formatScore");
  });

  it("exports formatCost function", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/stats-rows.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function formatCost");
  });

  it("exports StatsRowsProps interface", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/stats-rows.tsx"),
      "utf-8"
    );
    expect(content).toContain("export interface StatsRowsProps");
  });

  it("contains 'Last evaluator'", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/stats-rows.tsx"),
      "utf-8"
    );
    expect(content).toContain("Last evaluator");
  });

  it("contains 'Cost'", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/stats-rows.tsx"),
      "utf-8"
    );
    expect(content).toContain("Cost");
  });

  it("imports EvaluatorResultEvent and CostUpdateEvent from types", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/stats-rows.tsx"),
      "utf-8"
    );
    expect(content).toContain("EvaluatorResultEvent");
    expect(content).toContain("CostUpdateEvent");
  });

  it("uses toFixed for number formatting", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/stats-rows.tsx"),
      "utf-8"
    );
    expect(content).toContain("toFixed");
  });
});
