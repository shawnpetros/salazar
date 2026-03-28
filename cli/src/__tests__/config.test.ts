/**
 * F006 — readConfig() tests
 *
 * Verifies that readConfig() correctly reads ~/.harness/config.json,
 * applies defaults for any missing optional fields, and handles edge
 * cases such as missing files and invalid JSON.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readConfig, writeConfig, isFirstRun, DEFAULT_CONFIG, CONFIG_FILE_PATH } from "../lib/config.js";
import type { HarnessConfig } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Creates a unique temp directory for each test. */
function makeTempDir(): string {
  const dir = join(tmpdir(), `harness-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Writes a JSON config to a temp file and returns the path. */
function writeTempConfig(dir: string, data: unknown, filename = "config.json"): string {
  const path = join(dir, filename);
  writeFileSync(path, JSON.stringify(data), "utf-8");
  return path;
}

// ---------------------------------------------------------------------------
// DEFAULT_CONFIG export
// ---------------------------------------------------------------------------

describe("F006 — DEFAULT_CONFIG", () => {
  it("is exported and is a fully-populated HarnessConfig", () => {
    const cfg: HarnessConfig = DEFAULT_CONFIG;
    expect(cfg).toBeDefined();
    expect(cfg.models).toBeDefined();
    expect(cfg.dashboard).toBeDefined();
    expect(cfg.output).toBeDefined();
    expect(cfg.python).toBeDefined();
    expect(Array.isArray(cfg.history)).toBe(true);
  });

  it("has a non-empty default model", () => {
    expect(DEFAULT_CONFIG.models.default.length).toBeGreaterThan(0);
  });

  it("has a non-empty planner model", () => {
    expect(DEFAULT_CONFIG.models.planner.length).toBeGreaterThan(0);
  });

  it("has a non-empty generator model", () => {
    expect(DEFAULT_CONFIG.models.generator.length).toBeGreaterThan(0);
  });

  it("has a non-empty evaluator model", () => {
    expect(DEFAULT_CONFIG.models.evaluator.length).toBeGreaterThan(0);
  });

  it("has a non-empty dashboard url", () => {
    expect(DEFAULT_CONFIG.dashboard.url.length).toBeGreaterThan(0);
  });

  it("has a non-empty output defaultDir", () => {
    expect(DEFAULT_CONFIG.output.defaultDir.length).toBeGreaterThan(0);
  });

  it("has a non-empty python path", () => {
    expect(DEFAULT_CONFIG.python.path.length).toBeGreaterThan(0);
  });

  it("has an empty history array by default", () => {
    expect(DEFAULT_CONFIG.history).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CONFIG_FILE_PATH export
// ---------------------------------------------------------------------------

describe("F006 — CONFIG_FILE_PATH", () => {
  it("is exported as a string", () => {
    expect(typeof CONFIG_FILE_PATH).toBe("string");
  });

  it("ends with .harness/config.json", () => {
    expect(CONFIG_FILE_PATH).toMatch(/\.harness[/\\]config\.json$/);
  });

  it("is an absolute path", () => {
    expect(CONFIG_FILE_PATH.startsWith("/") || CONFIG_FILE_PATH.match(/^[A-Z]:\\/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// readConfig() — missing file
// ---------------------------------------------------------------------------

describe("F006 — readConfig() with missing config file", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it("returns a HarnessConfig when the file does not exist", () => {
    const path = join(tempDir, "nonexistent.json");
    const cfg = readConfig(path);
    expect(cfg).toBeDefined();
  });

  it("returns the full default config when file is absent", () => {
    const path = join(tempDir, "nonexistent.json");
    const cfg = readConfig(path);
    expect(cfg.models.default).toBe(DEFAULT_CONFIG.models.default);
    expect(cfg.models.planner).toBe(DEFAULT_CONFIG.models.planner);
    expect(cfg.models.generator).toBe(DEFAULT_CONFIG.models.generator);
    expect(cfg.models.evaluator).toBe(DEFAULT_CONFIG.models.evaluator);
  });

  it("returns empty history array when file is absent", () => {
    const path = join(tempDir, "nonexistent.json");
    const cfg = readConfig(path);
    expect(Array.isArray(cfg.history)).toBe(true);
    expect(cfg.history).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// readConfig() — invalid JSON
// ---------------------------------------------------------------------------

describe("F006 — readConfig() with invalid JSON", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it("does not throw when the file contains invalid JSON", () => {
    const path = join(tempDir, "config.json");
    writeFileSync(path, "{ this is not valid JSON }", "utf-8");
    expect(() => readConfig(path)).not.toThrow();
  });

  it("returns default config when the file contains invalid JSON", () => {
    const path = join(tempDir, "config.json");
    writeFileSync(path, "!!!", "utf-8");
    const cfg = readConfig(path);
    expect(cfg.models.default).toBe(DEFAULT_CONFIG.models.default);
  });
});

// ---------------------------------------------------------------------------
// readConfig() — fully-populated config file
// ---------------------------------------------------------------------------

describe("F006 — readConfig() with a fully-populated config file", () => {
  let tempDir: string;
  let configPath: string;

  const fullConfig: HarnessConfig = {
    models: {
      default: "my-default-model",
      planner: "my-planner-model",
      generator: "my-generator-model",
      evaluator: "my-evaluator-model",
    },
    dashboard: {
      url: "https://dashboard.example.com",
      secret: "my-secret",
    },
    output: {
      defaultDir: "/custom/output/dir",
    },
    python: {
      path: "/usr/local/bin/python3",
      venvPath: "/home/user/.venvs/my-venv",
    },
    history: [
      {
        sessionId: "session-abc",
        specName: "my-spec.md",
        startedAt: "2026-01-01T00:00:00.000Z",
        success: true,
      },
    ],
  };

  beforeEach(() => {
    tempDir = makeTempDir();
    configPath = writeTempConfig(tempDir, fullConfig);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it("returns the stored models.default value", () => {
    const cfg = readConfig(configPath);
    expect(cfg.models.default).toBe("my-default-model");
  });

  it("returns the stored models.planner value", () => {
    const cfg = readConfig(configPath);
    expect(cfg.models.planner).toBe("my-planner-model");
  });

  it("returns the stored models.generator value", () => {
    const cfg = readConfig(configPath);
    expect(cfg.models.generator).toBe("my-generator-model");
  });

  it("returns the stored models.evaluator value", () => {
    const cfg = readConfig(configPath);
    expect(cfg.models.evaluator).toBe("my-evaluator-model");
  });

  it("returns the stored dashboard.url", () => {
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.url).toBe("https://dashboard.example.com");
  });

  it("returns the stored dashboard.secret", () => {
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.secret).toBe("my-secret");
  });

  it("returns the stored output.defaultDir", () => {
    const cfg = readConfig(configPath);
    expect(cfg.output.defaultDir).toBe("/custom/output/dir");
  });

  it("returns the stored python.path", () => {
    const cfg = readConfig(configPath);
    expect(cfg.python.path).toBe("/usr/local/bin/python3");
  });

  it("returns the stored python.venvPath", () => {
    const cfg = readConfig(configPath);
    expect(cfg.python.venvPath).toBe("/home/user/.venvs/my-venv");
  });

  it("returns the stored history array", () => {
    const cfg = readConfig(configPath);
    expect(cfg.history).toHaveLength(1);
    expect(cfg.history[0]?.sessionId).toBe("session-abc");
  });
});

// ---------------------------------------------------------------------------
// readConfig() — partial config with defaults fallback
// ---------------------------------------------------------------------------

describe("F006 — readConfig() with partial config file (defaults fallback)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it("fills missing models fields with defaults when models block is absent", () => {
    const path = writeTempConfig(tempDir, {
      dashboard: { url: "http://my-dash.com", secret: "s" },
    });
    const cfg = readConfig(path);
    expect(cfg.models.default).toBe(DEFAULT_CONFIG.models.default);
    expect(cfg.models.planner).toBe(DEFAULT_CONFIG.models.planner);
  });

  it("merges partial models block — provided values win, missing use defaults", () => {
    const path = writeTempConfig(tempDir, {
      models: { default: "custom-model" },
    });
    const cfg = readConfig(path);
    expect(cfg.models.default).toBe("custom-model");
    expect(cfg.models.planner).toBe(DEFAULT_CONFIG.models.planner);
    expect(cfg.models.generator).toBe(DEFAULT_CONFIG.models.generator);
    expect(cfg.models.evaluator).toBe(DEFAULT_CONFIG.models.evaluator);
  });

  it("fills missing dashboard with defaults when absent", () => {
    const path = writeTempConfig(tempDir, {
      models: { default: "x", planner: "x", generator: "x", evaluator: "x" },
    });
    const cfg = readConfig(path);
    expect(cfg.dashboard.url).toBe(DEFAULT_CONFIG.dashboard.url);
  });

  it("fills missing output.defaultDir with default when absent", () => {
    const path = writeTempConfig(tempDir, { history: [] });
    const cfg = readConfig(path);
    expect(cfg.output.defaultDir).toBe(DEFAULT_CONFIG.output.defaultDir);
  });

  it("fills missing python settings with defaults when absent", () => {
    const path = writeTempConfig(tempDir, { history: [] });
    const cfg = readConfig(path);
    expect(cfg.python.path).toBe(DEFAULT_CONFIG.python.path);
    expect(cfg.python.venvPath).toBe(DEFAULT_CONFIG.python.venvPath);
  });

  it("defaults history to empty array when absent from file", () => {
    const path = writeTempConfig(tempDir, {
      models: { default: "x", planner: "x", generator: "x", evaluator: "x" },
    });
    const cfg = readConfig(path);
    expect(Array.isArray(cfg.history)).toBe(true);
    expect(cfg.history).toHaveLength(0);
  });

  it("returns an empty config object as the full defaults", () => {
    const path = writeTempConfig(tempDir, {});
    const cfg = readConfig(path);
    expect(cfg.models.default).toBe(DEFAULT_CONFIG.models.default);
    expect(cfg.output.defaultDir).toBe(DEFAULT_CONFIG.output.defaultDir);
    expect(cfg.history).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// readConfig() — return type shape
// ---------------------------------------------------------------------------

describe("F006 — readConfig() return type", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true });
  });

  it("always returns an object with a models field", () => {
    const path = join(tempDir, "no-file.json");
    const cfg = readConfig(path);
    expect(cfg.models).toBeDefined();
    expect(typeof cfg.models).toBe("object");
  });

  it("always returns an object with a dashboard field", () => {
    const path = join(tempDir, "no-file.json");
    const cfg = readConfig(path);
    expect(cfg.dashboard).toBeDefined();
  });

  it("always returns an object with an output field", () => {
    const path = join(tempDir, "no-file.json");
    const cfg = readConfig(path);
    expect(cfg.output).toBeDefined();
  });

  it("always returns an object with a python field", () => {
    const path = join(tempDir, "no-file.json");
    const cfg = readConfig(path);
    expect(cfg.python).toBeDefined();
  });

  it("always returns an object with a history array", () => {
    const path = join(tempDir, "no-file.json");
    const cfg = readConfig(path);
    expect(Array.isArray(cfg.history)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// F007 — writeConfig()
// ---------------------------------------------------------------------------

describe("F007 — writeConfig() creates directory and writes file", () => {
  let tempDir: string;

  beforeEach(() => {
    // Use a nested path that does not yet exist so we can verify mkdir behaviour.
    tempDir = join(tmpdir(), `harness-write-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it("creates the target directory when it does not exist", () => {
    const configPath = join(tempDir, ".harness", "config.json");
    writeConfig(DEFAULT_CONFIG, configPath);
    expect(existsSync(join(tempDir, ".harness"))).toBe(true);
  });

  it("creates the config.json file", () => {
    const configPath = join(tempDir, ".harness", "config.json");
    writeConfig(DEFAULT_CONFIG, configPath);
    expect(existsSync(configPath)).toBe(true);
  });

  it("writes valid JSON that can be parsed back", () => {
    const configPath = join(tempDir, ".harness", "config.json");
    writeConfig(DEFAULT_CONFIG, configPath);
    const raw = JSON.parse(readFileSync(configPath, "utf-8")) as HarnessConfig;
    expect(raw.models.default).toBe(DEFAULT_CONFIG.models.default);
  });

  it("round-trips a full HarnessConfig correctly via readConfig", () => {
    const configPath = join(tempDir, ".harness", "config.json");
    const customConfig: HarnessConfig = {
      ...DEFAULT_CONFIG,
      models: { ...DEFAULT_CONFIG.models, default: "claude-round-trip" },
    };
    writeConfig(customConfig, configPath);
    const read = readConfig(configPath);
    expect(read.models.default).toBe("claude-round-trip");
  });

  it("overwrites an existing config file with updated values", () => {
    mkdirSync(join(tempDir, ".harness"), { recursive: true });
    const configPath = join(tempDir, ".harness", "config.json");
    writeConfig(DEFAULT_CONFIG, configPath);
    const updated: HarnessConfig = {
      ...DEFAULT_CONFIG,
      models: { ...DEFAULT_CONFIG.models, default: "claude-updated" },
    };
    writeConfig(updated, configPath);
    const read = readConfig(configPath);
    expect(read.models.default).toBe("claude-updated");
  });

  it("writes pretty-printed JSON (contains newlines)", () => {
    const configPath = join(tempDir, ".harness", "config.json");
    writeConfig(DEFAULT_CONFIG, configPath);
    const content = readFileSync(configPath, "utf-8");
    expect(content).toContain("\n");
  });

  it("does not throw when the directory already exists", () => {
    mkdirSync(join(tempDir, ".harness"), { recursive: true });
    const configPath = join(tempDir, ".harness", "config.json");
    expect(() => writeConfig(DEFAULT_CONFIG, configPath)).not.toThrow();
  });

  it("serializes history array entries correctly", () => {
    const configPath = join(tempDir, ".harness", "config.json");
    const configWithHistory: HarnessConfig = {
      ...DEFAULT_CONFIG,
      history: [{ sessionId: "abc123", specName: "spec.md", startedAt: "2026-01-01T00:00:00.000Z", success: true }],
    };
    writeConfig(configWithHistory, configPath);
    const read = readConfig(configPath);
    expect(read.history).toHaveLength(1);
    expect(read.history[0]?.sessionId).toBe("abc123");
  });
});

// ---------------------------------------------------------------------------
// F008 — isFirstRun()
// ---------------------------------------------------------------------------

describe("F008 — isFirstRun() when config file is absent", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `harness-firstrun-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it("returns true when the config file does not exist", () => {
    const configPath = join(tempDir, "config.json");
    expect(isFirstRun(configPath)).toBe(true);
  });

  it("returns false when the config file exists", () => {
    const configPath = join(tempDir, "config.json");
    writeConfig(DEFAULT_CONFIG, configPath);
    expect(isFirstRun(configPath)).toBe(false);
  });

  it("returns true for a path in a non-existent directory", () => {
    const configPath = join(tempDir, "subdir", "config.json");
    expect(isFirstRun(configPath)).toBe(true);
  });

  it("returns false after writeConfig creates the file", () => {
    const configPath = join(tempDir, "config.json");
    expect(isFirstRun(configPath)).toBe(true);
    writeConfig(DEFAULT_CONFIG, configPath);
    expect(isFirstRun(configPath)).toBe(false);
  });

  it("is a function exported from lib/config.ts", () => {
    expect(typeof isFirstRun).toBe("function");
  });
});
