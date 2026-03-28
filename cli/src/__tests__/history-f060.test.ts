/**
 * F060 — history command: display list of past sessions with summary columns
 *
 * Verifies that:
 *  - renderHistoryRows is exported from lib/history-formatter.ts
 *  - formatDuration is exported and formats ms to 'Xm YYs'
 *  - formatCost is exported and formats USD to '$X.XX'
 *  - formatDate is exported and formats ISO string to locale date
 *  - formatScore is exported and formats number to 1 decimal place
 *  - renderHistoryRows returns a 'no history' message for an empty array
 *  - renderHistoryRows renders numbered rows
 *  - renderHistoryRows shows spec name column
 *  - renderHistoryRows shows features passed/total column (e.g. '18/21')
 *  - renderHistoryRows shows score column
 *  - renderHistoryRows shows duration column
 *  - renderHistoryRows shows cost column
 *  - renderHistoryRows shows session ID column (truncated to 8 chars)
 *  - renderHistoryRows shows date column
 *  - renderHistoryRows renders column headers
 *  - historyCommand is exported from commands/history.tsx
 *  - historyCommand reads config and prints a table
 *  - historyCommand prints 'No session history found.' when history is empty
 *  - historyCommand renders two entries from config.history
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { SessionRecord } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Two sample SessionRecord entries used across multiple tests. */
const record1: SessionRecord = {
  id: "abc12345",
  specName: "feature-spec.md",
  featuresTotal: 21,
  featuresPassing: 18,
  score: 8.6,
  durationMs: 4200000, // 70 minutes
  cost: 2.35,
  timestamp: "2026-03-27T10:00:00.000Z",
};

const record2: SessionRecord = {
  id: "def45678",
  specName: "other-spec.md",
  featuresTotal: 10,
  featuresPassing: 9,
  score: 9.0,
  durationMs: 1800000, // 30 minutes
  cost: 1.5,
  timestamp: "2026-03-27T12:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Temp dir helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = join(
    tmpdir(),
    `harness-f060-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeTempConfig(dir: string, history: unknown[]): string {
  const configPath = join(dir, "config.json");
  const config = {
    models: {
      default: "claude-sonnet-4-6",
      planner: "claude-opus-4-5",
      generator: "claude-sonnet-4-5",
      evaluator: "claude-haiku-3-5",
    },
    dashboard: { url: "http://localhost:3000", secret: "" },
    output: { defaultDir: "/tmp/harness" },
    python: { path: "python3", venvPath: "" },
    history,
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  return configPath;
}

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe("F060 — formatDuration", () => {
  it("is exported as a function from lib/history-formatter.ts", async () => {
    const { formatDuration } = await import("../lib/history-formatter.js");
    expect(typeof formatDuration).toBe("function");
  });

  it("formats 4200000ms as '70m 00s'", async () => {
    const { formatDuration } = await import("../lib/history-formatter.js");
    expect(formatDuration(4200000)).toBe("70m 00s");
  });

  it("formats 90000ms as '1m 30s'", async () => {
    const { formatDuration } = await import("../lib/history-formatter.js");
    expect(formatDuration(90000)).toBe("1m 30s");
  });

  it("formats 0ms as '0m 00s'", async () => {
    const { formatDuration } = await import("../lib/history-formatter.js");
    expect(formatDuration(0)).toBe("0m 00s");
  });

  it("pads seconds to two digits", async () => {
    const { formatDuration } = await import("../lib/history-formatter.js");
    expect(formatDuration(65000)).toBe("1m 05s");
  });
});

// ---------------------------------------------------------------------------
// formatCost
// ---------------------------------------------------------------------------

describe("F060 — formatCost", () => {
  it("is exported as a function from lib/history-formatter.ts", async () => {
    const { formatCost } = await import("../lib/history-formatter.js");
    expect(typeof formatCost).toBe("function");
  });

  it("formats 2.35 as '$2.35'", async () => {
    const { formatCost } = await import("../lib/history-formatter.js");
    expect(formatCost(2.35)).toBe("$2.35");
  });

  it("formats 0 as '$0.00'", async () => {
    const { formatCost } = await import("../lib/history-formatter.js");
    expect(formatCost(0)).toBe("$0.00");
  });

  it("formats 1.5 as '$1.50'", async () => {
    const { formatCost } = await import("../lib/history-formatter.js");
    expect(formatCost(1.5)).toBe("$1.50");
  });
});

// ---------------------------------------------------------------------------
// formatScore
// ---------------------------------------------------------------------------

describe("F060 — formatScore", () => {
  it("is exported as a function from lib/history-formatter.ts", async () => {
    const { formatScore } = await import("../lib/history-formatter.js");
    expect(typeof formatScore).toBe("function");
  });

  it("formats 8.6 as '8.6'", async () => {
    const { formatScore } = await import("../lib/history-formatter.js");
    expect(formatScore(8.6)).toBe("8.6");
  });

  it("formats 10 as '10.0'", async () => {
    const { formatScore } = await import("../lib/history-formatter.js");
    expect(formatScore(10)).toBe("10.0");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("F060 — formatDate", () => {
  it("is exported as a function from lib/history-formatter.ts", async () => {
    const { formatDate } = await import("../lib/history-formatter.js");
    expect(typeof formatDate).toBe("function");
  });

  it("returns a non-empty string for a valid ISO timestamp", async () => {
    const { formatDate } = await import("../lib/history-formatter.js");
    const result = formatDate("2026-03-27T10:00:00.000Z");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns the input string when the date is invalid", async () => {
    const { formatDate } = await import("../lib/history-formatter.js");
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

// ---------------------------------------------------------------------------
// renderHistoryRows — export
// ---------------------------------------------------------------------------

describe("F060 — renderHistoryRows export", () => {
  it("is exported as a function from lib/history-formatter.ts", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    expect(typeof renderHistoryRows).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// renderHistoryRows — empty list
// ---------------------------------------------------------------------------

describe("F060 — renderHistoryRows: empty list", () => {
  it("returns a 'no history' message for an empty array", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([]);
    expect(output).toContain("No session history found");
  });
});

// ---------------------------------------------------------------------------
// renderHistoryRows — numbered rows with two entries
// ---------------------------------------------------------------------------

describe("F060 — renderHistoryRows: two SessionRecord entries", () => {
  it("includes row number 1", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("1");
  });

  it("includes row number 2", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("2");
  });

  it("shows spec name for record1", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("feature-spec.md");
  });

  it("shows spec name for record2", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("other-spec.md");
  });

  it("shows features passed/total for record1 as '18/21'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("18/21");
  });

  it("shows features passed/total for record2 as '9/10'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("9/10");
  });

  it("shows score for record1 as '8.6'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("8.6");
  });

  it("shows score for record2 as '9.0'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("9.0");
  });

  it("shows duration for record1 as '70m 00s'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("70m 00s");
  });

  it("shows duration for record2 as '30m 00s'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("30m 00s");
  });

  it("shows cost for record1 as '$2.35'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("$2.35");
  });

  it("shows cost for record2 as '$1.50'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("$1.50");
  });

  it("shows session ID truncated to 8 chars for record1 ('abc12345')", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("abc12345");
  });

  it("shows session ID truncated to 8 chars for record2 ('def45678')", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    expect(output).toContain("def45678");
  });

  it("includes a date for record1", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    // The formatted date should contain a year
    expect(output).toMatch(/2026/);
  });

  it("renders column headers including 'Spec'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1]);
    expect(output).toContain("Spec");
  });

  it("renders column headers including 'Passed'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1]);
    expect(output).toContain("Passed");
  });

  it("renders column headers including 'Score'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1]);
    expect(output).toContain("Score");
  });

  it("renders column headers including 'Duration'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1]);
    expect(output).toContain("Duration");
  });

  it("renders column headers including 'Cost'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1]);
    expect(output).toContain("Cost");
  });

  it("renders column headers including 'Session ID'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1]);
    expect(output).toContain("Session ID");
  });

  it("renders column headers including 'Date'", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1]);
    expect(output).toContain("Date");
  });

  it("output is a multi-line string", async () => {
    const { renderHistoryRows } = await import("../lib/history-formatter.js");
    const output = renderHistoryRows([record1, record2]);
    const lines = output.split("\n");
    // At minimum: header, separator, two data rows = 4 lines
    expect(lines.length).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// historyCommand — export
// ---------------------------------------------------------------------------

describe("F060 — historyCommand export", () => {
  it("is exported as a function from commands/history.tsx", async () => {
    const { historyCommand } = await import("../commands/history.js");
    expect(typeof historyCommand).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// historyCommand — behavior with config
// ---------------------------------------------------------------------------

describe("F060 — historyCommand: reads and renders config history", () => {
  let tempDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = makeTempDir();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    rmSync(tempDir, { recursive: true });
  });

  it("prints 'No session history found.' when history is empty", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, []);
    historyCommand(configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("No session history found");
  });

  it("prints a table when config.history has two SessionRecord entries", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [record1, record2]);
    historyCommand(configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("feature-spec.md");
    expect(output).toContain("other-spec.md");
  });

  it("shows features passed/total for each entry", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [record1, record2]);
    historyCommand(configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("18/21");
    expect(output).toContain("9/10");
  });

  it("shows score for each entry", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [record1, record2]);
    historyCommand(configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("8.6");
    expect(output).toContain("9.0");
  });

  it("shows duration for each entry", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [record1, record2]);
    historyCommand(configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("70m 00s");
    expect(output).toContain("30m 00s");
  });

  it("shows cost for each entry", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [record1, record2]);
    historyCommand(configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("$2.35");
    expect(output).toContain("$1.50");
  });

  it("shows session ID for each entry", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [record1, record2]);
    historyCommand(configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("abc12345");
    expect(output).toContain("def45678");
  });

  it("shows numbered rows (1 and 2) for two entries", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [record1, record2]);
    historyCommand(configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    // Check that rows start with row numbers
    const lines = output.split("\n");
    // Find data rows (after header and separator)
    const dataLines = lines.filter(
      (l) => l.trimStart().startsWith("1") || l.trimStart().startsWith("2")
    );
    expect(dataLines.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// historyCommand — handles HarnessHistoryEntry shape (older data format)
// ---------------------------------------------------------------------------

describe("F060 — historyCommand: handles HarnessHistoryEntry shape", () => {
  let tempDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = makeTempDir();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    rmSync(tempDir, { recursive: true });
  });

  it("renders without throwing for HarnessHistoryEntry-shaped entries", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const entry = {
      sessionId: "old-sess",
      specName: "old-spec.md",
      startedAt: "2026-01-01T00:00:00.000Z",
      success: true,
    };
    const configPath = writeTempConfig(tempDir, [entry]);
    expect(() => historyCommand(configPath)).not.toThrow();
  });

  it("shows specName from HarnessHistoryEntry", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const entry = {
      sessionId: "old-sess-id",
      specName: "legacy-spec.md",
      startedAt: "2026-01-01T00:00:00.000Z",
      success: false,
    };
    const configPath = writeTempConfig(tempDir, [entry]);
    historyCommand(configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("legacy-spec.md");
  });

  it("shows sessionId from HarnessHistoryEntry", async () => {
    const { historyCommand } = await import("../commands/history.js");
    const entry = {
      sessionId: "old12345",
      specName: "legacy-spec.md",
      startedAt: "2026-01-01T00:00:00.000Z",
      success: false,
    };
    const configPath = writeTempConfig(tempDir, [entry]);
    historyCommand(configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("old12345");
  });
});
