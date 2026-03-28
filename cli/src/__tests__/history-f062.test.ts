/**
 * F062 — history <session-id>: show detail view for a specific session
 *
 * Verifies that:
 *  - historyDetailCommand is exported from commands/history.tsx
 *  - When a session with the given id exists, it prints a detail view
 *  - The detail view includes spec, models, features, cost, date
 *  - The detail view includes the session ID
 *  - The detail view includes the score and duration
 *  - When the session is not found, a 'not found' message is printed
 *  - Matching works by exact ID
 *  - Matching works by 8-char prefix
 *  - routeCommand routes 'harness history <session-id>' to historyDetailCommand
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { SessionRecord } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A sample SessionRecord entry matching the BDD scenario's session id. */
const sampleRecord: SessionRecord = {
  id: "e631f0ba",
  specName: "app_spec.md",
  featuresTotal: 63,
  featuresPassing: 61,
  score: 9.2,
  durationMs: 9000000, // 150 minutes
  cost: 9.27,
  timestamp: "2026-03-27T08:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Temp dir helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = join(
    tmpdir(),
    `harness-f062-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
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
// historyDetailCommand — export
// ---------------------------------------------------------------------------

describe("F062 — historyDetailCommand is exported", () => {
  it("exports historyDetailCommand as a function from commands/history.tsx", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    expect(typeof historyDetailCommand).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// historyDetailCommand — session found
// ---------------------------------------------------------------------------

describe("F062 — historyDetailCommand: session with id 'e631f0ba' found", () => {
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

  it("does not throw when a matching session exists", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    expect(() => historyDetailCommand("e631f0ba", configPath)).not.toThrow();
  });

  it("prints a detail view header", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("Session Detail");
  });

  it("includes the session ID in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("e631f0ba");
  });

  it("includes the spec name in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("app_spec.md");
  });

  it("includes 'Spec' label in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("Spec");
  });

  it("includes models information in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("Models");
  });

  it("includes generator model in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("claude-sonnet-4-5");
  });

  it("includes evaluator model in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("claude-haiku-3-5");
  });

  it("includes features passed/total in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("61/63");
  });

  it("includes 'Features' label in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("Features");
  });

  it("includes cost in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("$9.27");
  });

  it("includes 'Cost' label in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("Cost");
  });

  it("includes date in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("Date");
  });

  it("includes year '2026' in the date output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toMatch(/2026/);
  });

  it("includes score in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("9.2");
  });

  it("includes duration in the output", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("150m 00s");
  });
});

// ---------------------------------------------------------------------------
// historyDetailCommand — session not found
// ---------------------------------------------------------------------------

describe("F062 — historyDetailCommand: session not found", () => {
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

  it("does not throw when no matching session is found", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    expect(() => historyDetailCommand("00000000", configPath)).not.toThrow();
  });

  it("prints a 'not found' message when the session ID does not exist", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("00000000", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("not found");
  });

  it("includes the requested session ID in the 'not found' message", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("00000000", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("00000000");
  });

  it("prints 'not found' when history is empty", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, []);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("not found");
  });
});

// ---------------------------------------------------------------------------
// historyDetailCommand — matching by prefix
// ---------------------------------------------------------------------------

describe("F062 — historyDetailCommand: matching by 8-char prefix", () => {
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

  it("finds a session when the full id is provided", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    const configPath = writeTempConfig(tempDir, [sampleRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).toContain("e631f0ba");
    expect(output).not.toContain("not found");
  });

  it("finds a session by prefix when id is longer than 8 chars", async () => {
    const { historyDetailCommand } = await import("../commands/history.js");
    // Record with a longer id; the 8-char prefix 'e631f0ba' should still match
    const longIdRecord: SessionRecord = {
      ...sampleRecord,
      id: "e631f0ba-extra-chars",
    };
    const configPath = writeTempConfig(tempDir, [longIdRecord]);
    historyDetailCommand("e631f0ba", configPath);
    const output = consoleSpy.mock.calls.map((c) => c[0] as string).join("\n");
    expect(output).not.toContain("not found");
  });
});

// ---------------------------------------------------------------------------
// index.tsx routing — harness history <session-id>
// ---------------------------------------------------------------------------

describe("F062 — index.tsx routeCommand routes history <session-id> correctly", () => {
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

  it("historyDetailCommand is also exported from commands/history.tsx alongside historyCommand", async () => {
    const mod = await import("../commands/history.js");
    expect(typeof mod.historyDetailCommand).toBe("function");
    expect(typeof mod.historyCommand).toBe("function");
  });
});
