/**
 * F045 — Timeline component: scrollable list of past feature results with timestamps
 *
 * Verifies that:
 *  - Timeline is exported as a function from components/timeline.tsx
 *  - TimelineEntry and TimelineProps interfaces are exported
 *  - formatDuration is exported and formats ms correctly
 *  - formatStartOffset is exported and prefixes with '+'
 *  - renderTimelineEntry is exported and formats like '+1m 46s  2m 12s  F001 passed'
 *  - Timeline accepts entries prop
 *  - Timeline renders a box with title 'Timeline'
 *  - Each entry row contains the offset, duration, and feature label
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

describe("F045 — Timeline exports", () => {
  it("Timeline is exported as a function from components/timeline.tsx", async () => {
    const { Timeline } = await import("../components/timeline.js");
    expect(typeof Timeline).toBe("function");
  });

  it("formatDuration is exported as a function from components/timeline.tsx", async () => {
    const { formatDuration } = await import("../components/timeline.js");
    expect(typeof formatDuration).toBe("function");
  });

  it("formatStartOffset is exported as a function from components/timeline.tsx", async () => {
    const { formatStartOffset } = await import("../components/timeline.js");
    expect(typeof formatStartOffset).toBe("function");
  });

  it("renderTimelineEntry is exported as a function from components/timeline.tsx", async () => {
    const { renderTimelineEntry } = await import("../components/timeline.js");
    expect(typeof renderTimelineEntry).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe("F045 — formatDuration", () => {
  it("formats sub-minute durations as Xs", async () => {
    const { formatDuration } = await import("../components/timeline.js");
    expect(formatDuration(5000)).toBe("5s");
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(59000)).toBe("59s");
  });

  it("formats 60+ second durations as Xm Ys", async () => {
    const { formatDuration } = await import("../components/timeline.js");
    expect(formatDuration(60000)).toBe("1m 0s");
    expect(formatDuration(132000)).toBe("2m 12s");
    expect(formatDuration(106000)).toBe("1m 46s");
  });

  it("truncates fractional seconds (floor)", async () => {
    const { formatDuration } = await import("../components/timeline.js");
    // 5500ms = 5.5s → floors to 5s
    expect(formatDuration(5500)).toBe("5s");
  });
});

// ---------------------------------------------------------------------------
// formatStartOffset
// ---------------------------------------------------------------------------

describe("F045 — formatStartOffset", () => {
  it("prefixes duration with + sign", async () => {
    const { formatStartOffset } = await import("../components/timeline.js");
    expect(formatStartOffset(0)).toBe("+0s");
    expect(formatStartOffset(5000)).toBe("+5s");
    expect(formatStartOffset(106000)).toBe("+1m 46s");
  });

  it("formats 132000ms as +2m 12s", async () => {
    const { formatStartOffset } = await import("../components/timeline.js");
    expect(formatStartOffset(132000)).toBe("+2m 12s");
  });
});

// ---------------------------------------------------------------------------
// renderTimelineEntry
// ---------------------------------------------------------------------------

describe("F045 — renderTimelineEntry output format", () => {
  it("renders the canonical example '+1m 46s  2m 12s  F001 passed'", async () => {
    const { renderTimelineEntry } = await import("../components/timeline.js");
    const entry = {
      startOffsetMs: 106000,
      durationMs: 132000,
      featureId: "F001",
      result: "passed",
    };
    expect(renderTimelineEntry(entry)).toBe("+1m 46s  2m 12s  F001 passed");
  });

  it("renders a failed entry correctly", async () => {
    const { renderTimelineEntry } = await import("../components/timeline.js");
    const entry = {
      startOffsetMs: 0,
      durationMs: 5000,
      featureId: "F002",
      result: "failed",
    };
    expect(renderTimelineEntry(entry)).toBe("+0s  5s  F002 failed");
  });

  it("contains the featureId in the output", async () => {
    const { renderTimelineEntry } = await import("../components/timeline.js");
    const entry = {
      startOffsetMs: 60000,
      durationMs: 30000,
      featureId: "F010",
      result: "passed",
    };
    const result = renderTimelineEntry(entry);
    expect(result).toContain("F010");
    expect(result).toContain("passed");
  });

  it("contains the start offset in the output", async () => {
    const { renderTimelineEntry } = await import("../components/timeline.js");
    const entry = {
      startOffsetMs: 106000,
      durationMs: 60000,
      featureId: "F003",
      result: "passed",
    };
    const result = renderTimelineEntry(entry);
    expect(result).toContain("+1m 46s");
  });

  it("contains the duration in the output", async () => {
    const { renderTimelineEntry } = await import("../components/timeline.js");
    const entry = {
      startOffsetMs: 0,
      durationMs: 132000,
      featureId: "F003",
      result: "passed",
    };
    const result = renderTimelineEntry(entry);
    expect(result).toContain("2m 12s");
  });
});

// ---------------------------------------------------------------------------
// React element checks
// ---------------------------------------------------------------------------

describe("F045 — Timeline React element", () => {
  it("Timeline returns a React element when called directly", async () => {
    const { Timeline } = await import("../components/timeline.js");
    const el = Timeline({ entries: [] });
    expect(el).toBeDefined();
    expect(typeof el).toBe("object");
  });

  it("React.createElement works with Timeline and entries prop", async () => {
    const { Timeline } = await import("../components/timeline.js");
    const entries = [
      {
        startOffsetMs: 106000,
        durationMs: 132000,
        featureId: "F001",
        result: "passed",
      },
    ];
    const el = React.createElement(Timeline, { entries });
    expect(el.type).toBe(Timeline);
    expect(el.props.entries).toEqual(entries);
  });

  it("Timeline accepts empty entries array", async () => {
    const { Timeline } = await import("../components/timeline.js");
    const el = React.createElement(Timeline, { entries: [] });
    expect(el.props.entries).toHaveLength(0);
  });

  it("Timeline accepts multiple entries", async () => {
    const { Timeline } = await import("../components/timeline.js");
    const entries = [
      { startOffsetMs: 0, durationMs: 5000, featureId: "F001", result: "passed" },
      { startOffsetMs: 106000, durationMs: 132000, featureId: "F002", result: "failed" },
      { startOffsetMs: 250000, durationMs: 80000, featureId: "F003", result: "passed" },
    ];
    const el = React.createElement(Timeline, { entries });
    expect(el.props.entries).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Source-level assertions
// ---------------------------------------------------------------------------

describe("F045 — timeline.tsx source structure", () => {
  it("timeline.tsx exports Timeline", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function Timeline");
  });

  it("timeline.tsx exports TimelineEntry interface", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("export interface TimelineEntry");
  });

  it("timeline.tsx exports TimelineProps interface", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("export interface TimelineProps");
  });

  it("timeline.tsx exports renderTimelineEntry", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function renderTimelineEntry");
  });

  it("timeline.tsx exports formatDuration", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function formatDuration");
  });

  it("timeline.tsx exports formatStartOffset", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function formatStartOffset");
  });

  it("timeline.tsx contains the title 'Timeline'", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("Timeline");
  });

  it("timeline.tsx uses entries prop", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("entries");
  });

  it("timeline.tsx uses startOffsetMs field", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("startOffsetMs");
  });

  it("timeline.tsx uses durationMs field", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("durationMs");
  });

  it("timeline.tsx uses featureId field", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("featureId");
  });

  it("timeline.tsx uses result field", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/timeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("result");
  });
});
