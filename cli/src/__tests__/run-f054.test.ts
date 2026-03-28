/**
 * F054 — run command: save completed session to config history
 *
 * Verifies that:
 *  - buildSessionRecord is exported from lib/session-history.ts
 *  - buildSessionRecord produces a SessionRecord with correct fields
 *  - saveSessionToHistory is exported from lib/session-history.ts
 *  - saveSessionToHistory appends a HarnessHistoryEntry to config.history
 *  - saveSessionToHistory calls writeConfig() to persist the history to disk
 *  - run-dashboard.tsx source imports saveSessionToHistory
 *  - run-dashboard.tsx source calls saveSessionToHistory in the completion path
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SessionCompleteEvent } from "../lib/types.js";
import type { HarnessConfig } from "../lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "f054-test-"));
}

function makeConfig(history: HarnessConfig["history"] = []): HarnessConfig {
  return {
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
}

function writeTempConfig(dir: string, config: HarnessConfig): string {
  const configPath = join(dir, "config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  return configPath;
}

/** A minimal session_complete event fixture. */
const makeSessionCompleteEvent = (
  overrides?: Partial<SessionCompleteEvent>
): SessionCompleteEvent => ({
  type: "session_complete",
  passing: 8,
  totalFeatures: 10,
  durationMs: 60000,
  cost: 2.5,
  ...overrides,
});

// ---------------------------------------------------------------------------
// buildSessionRecord — export check
// ---------------------------------------------------------------------------

describe("F054 — buildSessionRecord exports", () => {
  it("is exported as a function from lib/session-history.ts", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    expect(typeof buildSessionRecord).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// buildSessionRecord — correctness
// ---------------------------------------------------------------------------

describe("F054 — buildSessionRecord: field values", () => {
  it("sets id to the given sessionId", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent();
    const record = buildSessionRecord("session-abc", "spec.md", event);
    expect(record.id).toBe("session-abc");
  });

  it("sets specName to the given specName", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent();
    const record = buildSessionRecord("s1", "my-feature-spec.md", event);
    expect(record.specName).toBe("my-feature-spec.md");
  });

  it("sets featuresTotal from event.totalFeatures", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent({ totalFeatures: 21 });
    const record = buildSessionRecord("s1", "spec.md", event);
    expect(record.featuresTotal).toBe(21);
  });

  it("sets featuresPassing from event.passing", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent({ passing: 17 });
    const record = buildSessionRecord("s1", "spec.md", event);
    expect(record.featuresPassing).toBe(17);
  });

  it("sets durationMs from event.durationMs", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent({ durationMs: 120000 });
    const record = buildSessionRecord("s1", "spec.md", event);
    expect(record.durationMs).toBe(120000);
  });

  it("sets cost from event.cost", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent({ cost: 3.75 });
    const record = buildSessionRecord("s1", "spec.md", event);
    expect(record.cost).toBe(3.75);
  });

  it("sets timestamp to the provided value when given", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent();
    const ts = "2026-03-27T10:00:00.000Z";
    const record = buildSessionRecord("s1", "spec.md", event, ts);
    expect(record.timestamp).toBe(ts);
  });

  it("sets timestamp to a valid ISO string when not provided", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent();
    const record = buildSessionRecord("s1", "spec.md", event);
    expect(typeof record.timestamp).toBe("string");
    expect(record.timestamp.length).toBeGreaterThan(0);
    // Should parse as a valid date
    expect(Number.isNaN(new Date(record.timestamp).getTime())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildSessionRecord — score computation
// ---------------------------------------------------------------------------

describe("F054 — buildSessionRecord: score calculation", () => {
  it("computes score as (passing / totalFeatures) * 10", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent({ passing: 8, totalFeatures: 10 });
    const record = buildSessionRecord("s1", "spec.md", event);
    expect(record.score).toBe(8);
  });

  it("returns score of 10 when all features pass", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent({ passing: 5, totalFeatures: 5 });
    const record = buildSessionRecord("s1", "spec.md", event);
    expect(record.score).toBe(10);
  });

  it("returns score of 0 when no features pass", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent({ passing: 0, totalFeatures: 10 });
    const record = buildSessionRecord("s1", "spec.md", event);
    expect(record.score).toBe(0);
  });

  it("returns score of 0 when totalFeatures is 0", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent({ passing: 0, totalFeatures: 0 });
    const record = buildSessionRecord("s1", "spec.md", event);
    expect(record.score).toBe(0);
  });

  it("computes fractional score correctly", async () => {
    const { buildSessionRecord } = await import("../lib/session-history.js");
    const event = makeSessionCompleteEvent({ passing: 1, totalFeatures: 3 });
    const record = buildSessionRecord("s1", "spec.md", event);
    expect(record.score).toBeCloseTo(3.333, 2);
  });
});

// ---------------------------------------------------------------------------
// saveSessionToHistory — export check
// ---------------------------------------------------------------------------

describe("F054 — saveSessionToHistory exports", () => {
  it("is exported as a function from lib/session-history.ts", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    expect(typeof saveSessionToHistory).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// saveSessionToHistory — appends to config.history
// ---------------------------------------------------------------------------

describe("F054 — saveSessionToHistory: appends history entry", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it("appends one entry to an empty history", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    const { readConfig } = await import("../lib/config.js");
    const config = makeConfig([]);
    const configPath = writeTempConfig(tempDir, config);
    const event = makeSessionCompleteEvent({ passing: 5, totalFeatures: 5 });

    saveSessionToHistory("sess-1", "spec.md", event, config, configPath);

    const read = readConfig(configPath);
    expect(read.history).toHaveLength(1);
  });

  it("appends to existing history without removing prior entries", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    const { readConfig } = await import("../lib/config.js");
    const existingEntry = {
      sessionId: "old-sess",
      specName: "old-spec.md",
      startedAt: "2026-01-01T00:00:00.000Z",
      success: true,
    };
    const config = makeConfig([existingEntry]);
    const configPath = writeTempConfig(tempDir, config);
    const event = makeSessionCompleteEvent();

    saveSessionToHistory("new-sess", "new-spec.md", event, config, configPath);

    const read = readConfig(configPath);
    expect(read.history).toHaveLength(2);
    expect(read.history[0]?.sessionId).toBe("old-sess");
  });

  it("stores the sessionId in the history entry", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    const { readConfig } = await import("../lib/config.js");
    const config = makeConfig([]);
    const configPath = writeTempConfig(tempDir, config);
    const event = makeSessionCompleteEvent();

    saveSessionToHistory("my-session-id", "spec.md", event, config, configPath);

    const read = readConfig(configPath);
    expect(read.history[0]?.sessionId).toBe("my-session-id");
  });

  it("stores the specName in the history entry", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    const { readConfig } = await import("../lib/config.js");
    const config = makeConfig([]);
    const configPath = writeTempConfig(tempDir, config);
    const event = makeSessionCompleteEvent();

    saveSessionToHistory("s1", "my-spec.md", event, config, configPath);

    const read = readConfig(configPath);
    expect(read.history[0]?.specName).toBe("my-spec.md");
  });

  it("sets success=true when all features passed", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    const { readConfig } = await import("../lib/config.js");
    const config = makeConfig([]);
    const configPath = writeTempConfig(tempDir, config);
    const event = makeSessionCompleteEvent({ passing: 10, totalFeatures: 10 });

    saveSessionToHistory("s1", "spec.md", event, config, configPath);

    const read = readConfig(configPath);
    expect(read.history[0]?.success).toBe(true);
  });

  it("sets success=false when some features failed", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    const { readConfig } = await import("../lib/config.js");
    const config = makeConfig([]);
    const configPath = writeTempConfig(tempDir, config);
    const event = makeSessionCompleteEvent({ passing: 7, totalFeatures: 10 });

    saveSessionToHistory("s1", "spec.md", event, config, configPath);

    const read = readConfig(configPath);
    expect(read.history[0]?.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveSessionToHistory — writeConfig() is called (disk persistence)
// ---------------------------------------------------------------------------

describe("F054 — saveSessionToHistory: persists to disk", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it("creates the config file if it does not exist", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    const config = makeConfig([]);
    const configPath = join(tempDir, "new-config.json");
    const event = makeSessionCompleteEvent();

    saveSessionToHistory("s1", "spec.md", event, config, configPath);

    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as { history?: unknown[] };
    expect(Array.isArray(parsed.history)).toBe(true);
    expect(parsed.history).toHaveLength(1);
  });

  it("the persisted file has the new history entry", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    const config = makeConfig([]);
    const configPath = writeTempConfig(tempDir, config);
    const event = makeSessionCompleteEvent({ passing: 3, totalFeatures: 5 });

    saveSessionToHistory("persisted-id", "persisted-spec.md", event, config, configPath);

    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as {
      history?: Array<{ sessionId: string; specName: string }>;
    };
    expect(parsed.history).toHaveLength(1);
    expect(parsed.history?.[0]?.sessionId).toBe("persisted-id");
    expect(parsed.history?.[0]?.specName).toBe("persisted-spec.md");
  });

  it("the config file is valid JSON after writing", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    const config = makeConfig([]);
    const configPath = writeTempConfig(tempDir, config);
    const event = makeSessionCompleteEvent();

    saveSessionToHistory("s1", "spec.md", event, config, configPath);

    expect(() => {
      JSON.parse(readFileSync(configPath, "utf-8"));
    }).not.toThrow();
  });

  it("preserves other config fields after writing", async () => {
    const { saveSessionToHistory } = await import("../lib/session-history.js");
    const { readConfig } = await import("../lib/config.js");
    const config = makeConfig([]);
    const configPath = writeTempConfig(tempDir, config);
    const event = makeSessionCompleteEvent();

    saveSessionToHistory("s1", "spec.md", event, config, configPath);

    const read = readConfig(configPath);
    expect(read.models.default).toBe("claude-sonnet-4-6");
    expect(read.dashboard.url).toBe("http://localhost:3000");
  });
});

// ---------------------------------------------------------------------------
// Source-level assertions: run-dashboard.tsx integrates saveSessionToHistory
// ---------------------------------------------------------------------------

describe("F054 — run-dashboard.tsx source structure", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "components/run-dashboard.tsx"), "utf-8");

  it("imports saveSessionToHistory from session-history", () => {
    expect(getSource()).toContain("saveSessionToHistory");
  });

  it("imports saveSessionToHistory from the session-history module", () => {
    const src = getSource();
    expect(src).toContain("session-history");
  });

  it("calls saveSessionToHistory in the completion path", () => {
    const src = getSource();
    expect(src).toContain("saveSessionToHistory(");
  });

  it("passes sessionId to saveSessionToHistory", () => {
    const src = getSource();
    expect(src).toContain("sessionId");
  });

  it("passes specPath to saveSessionToHistory", () => {
    const src = getSource();
    expect(src).toContain("specPath");
  });

  it("passes sessionCompleteEvent to saveSessionToHistory", () => {
    const src = getSource();
    expect(src).toContain("sessionCompleteEvent");
  });

  it("passes config to saveSessionToHistory", () => {
    const src = getSource();
    expect(src).toContain("config,");
  });
});

// ---------------------------------------------------------------------------
// Source-level assertions: lib/session-history.ts structure
// ---------------------------------------------------------------------------

describe("F054 — lib/session-history.ts source structure", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "lib/session-history.ts"), "utf-8");

  it("exports buildSessionRecord function", () => {
    expect(getSource()).toContain("export function buildSessionRecord");
  });

  it("exports saveSessionToHistory function", () => {
    expect(getSource()).toContain("export function saveSessionToHistory");
  });

  it("calls writeConfig to persist changes", () => {
    expect(getSource()).toContain("writeConfig(");
  });

  it("imports writeConfig from config module", () => {
    expect(getSource()).toContain("writeConfig");
  });
});
