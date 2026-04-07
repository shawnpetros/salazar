/**
 * F044 — Progress bar component: render filled/empty bar with percentage
 *
 * Verifies that:
 *  - ProgressBar is exported as a function from components/progress.tsx
 *  - renderProgressBar is exported as a function from components/progress.tsx
 *  - ProgressBar accepts done and total props
 *  - renderProgressBar returns a string with ━ filled chars and ░ empty chars
 *  - The percentage label is correct (Math.round(done/total*100)%)
 *  - The filled portion is proportional to done/total
 *  - Edge cases: done=0, done=total, done>total
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Export checks
// ---------------------------------------------------------------------------

describe("F044 — ProgressBar exports", () => {
  it("ProgressBar is exported as a function from components/progress.tsx", async () => {
    const { ProgressBar } = await import("../components/progress.js");
    expect(typeof ProgressBar).toBe("function");
  });

  it("renderProgressBar is exported as a function from components/progress.tsx", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    expect(typeof renderProgressBar).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// React element checks
// ---------------------------------------------------------------------------

describe("F044 — ProgressBar React element", () => {
  it("ProgressBar returns a React element when called directly", async () => {
    const { ProgressBar } = await import("../components/progress.js");
    const el = ProgressBar({ done: 8, total: 21 });
    expect(el).toBeDefined();
    expect(typeof el).toBe("object");
  });

  it("React.createElement works with ProgressBar and done/total props", async () => {
    const { ProgressBar } = await import("../components/progress.js");
    const el = React.createElement(ProgressBar, { done: 8, total: 21 });
    expect(el.type).toBe(ProgressBar);
    expect(el.props.done).toBe(8);
    expect(el.props.total).toBe(21);
  });

  it("ProgressBar accepts optional width prop", async () => {
    const { ProgressBar } = await import("../components/progress.js");
    const el = React.createElement(ProgressBar, { done: 5, total: 10, width: 30 });
    expect(el.props.width).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// renderProgressBar string output
// ---------------------------------------------------------------------------

describe("F044 — renderProgressBar output format", () => {
  it("returns a string containing the percentage label for done=8, total=21", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    const result = renderProgressBar(8, 21);
    // 8/21 ≈ 38%
    expect(result).toContain("38%");
  });

  it("returns a string containing filled chars (━) proportional to done/total", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    // done=8, total=21, width=20 → filled = Math.round(8/21 * 20) = 8
    const result = renderProgressBar(8, 21, 20);
    const filledCount = [...result].filter((c) => c === "━").length;
    expect(filledCount).toBe(8);
  });

  it("returns a string containing empty chars (░) for the remainder", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    // done=8, total=21, width=20 → empty = 20 - 8 = 12
    const result = renderProgressBar(8, 21, 20);
    const emptyCount = [...result].filter((c) => c === "░").length;
    expect(emptyCount).toBe(12);
  });

  it("filled + empty chars equal the specified width", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    const width = 20;
    const result = renderProgressBar(8, 21, width);
    const filled = [...result].filter((c) => c === "━").length;
    const empty = [...result].filter((c) => c === "░").length;
    expect(filled + empty).toBe(width);
  });

  it("shows 100% and all filled chars when done equals total", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    const width = 20;
    const result = renderProgressBar(21, 21, width);
    const filled = [...result].filter((c) => c === "━").length;
    const empty = [...result].filter((c) => c === "░").length;
    expect(result).toContain("100%");
    expect(filled).toBe(width);
    expect(empty).toBe(0);
  });

  it("shows 0% and all empty chars when done is 0", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    const width = 20;
    const result = renderProgressBar(0, 21, width);
    const filled = [...result].filter((c) => c === "━").length;
    const empty = [...result].filter((c) => c === "░").length;
    expect(result).toContain("0%");
    expect(filled).toBe(0);
    expect(empty).toBe(width);
  });

  it("clamps to 100% when done exceeds total", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    const width = 20;
    const result = renderProgressBar(30, 21, width);
    expect(result).toContain("100%");
    const filled = [...result].filter((c) => c === "━").length;
    expect(filled).toBe(width);
  });

  it("handles total=0 gracefully (shows 0%)", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    const result = renderProgressBar(0, 0);
    expect(result).toContain("0%");
  });

  it("default width is 20 chars", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    const result = renderProgressBar(5, 10);
    const filled = [...result].filter((c) => c === "━").length;
    const empty = [...result].filter((c) => c === "░").length;
    expect(filled + empty).toBe(20);
  });

  it("uses custom width when specified", async () => {
    const { renderProgressBar } = await import("../components/progress.js");
    const result = renderProgressBar(5, 10, 30);
    const filled = [...result].filter((c) => c === "━").length;
    const empty = [...result].filter((c) => c === "░").length;
    expect(filled + empty).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// Source-level assertions
// ---------------------------------------------------------------------------

describe("F044 — progress.tsx source structure", () => {
  it("progress.tsx exports ProgressBar", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/progress.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function ProgressBar");
  });

  it("progress.tsx exports renderProgressBar", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/progress.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function renderProgressBar");
  });

  it("progress.tsx uses the ━ (U+2501) filled character", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/progress.tsx"),
      "utf-8"
    );
    expect(content).toContain("━");
  });

  it("progress.tsx uses the ░ (U+2591) empty character", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/progress.tsx"),
      "utf-8"
    );
    expect(content).toContain("░");
  });

  it("progress.tsx includes done and total in ProgressBarProps", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/progress.tsx"),
      "utf-8"
    );
    expect(content).toContain("done");
    expect(content).toContain("total");
  });

  it("progress.tsx contains percentage calculation", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/progress.tsx"),
      "utf-8"
    );
    // Should compute percentage (done/total * 100)
    expect(content).toMatch(/100/);
    expect(content).toMatch(/ratio|done.*total|pct|percent/i);
  });
});
