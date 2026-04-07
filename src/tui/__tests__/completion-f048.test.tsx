/**
 * F048 — Completion screen component
 *
 * The Completion component is exported from components/completion.tsx and its
 * formatCost helper is also used by components/stats-rows.tsx (tested in F047).
 */

import { describe, it, expect } from "vitest";

// Minimal smoke test: verify Completion is importable and is a function
describe("F048 — Completion component smoke tests", () => {
  it("Completion is exported as a function from components/completion.tsx", async () => {
    const { Completion } = await import("../components/completion.js");
    expect(typeof Completion).toBe("function");
  });

  it("formatCost is exported as a function from components/completion.tsx", async () => {
    const { formatCost } = await import("../components/completion.js");
    expect(typeof formatCost).toBe("function");
    expect(formatCost(9.27)).toBe("$9.27");
    expect(formatCost(0.1)).toBe("$0.10");
  });
});
