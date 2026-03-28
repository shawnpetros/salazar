/**
 * F058 — config set model: update models.default in config file
 *
 * Verifies that:
 *  - configSetModelCommand is exported from commands/config.tsx
 *  - It calls setConfigKey('models.default', <value>) on the config file
 *  - config.models.default is updated to the provided model name
 *  - A success message is printed to stdout
 *  - The CLI router handles `harness config set model <value>`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readConfig, writeConfig, DEFAULT_CONFIG } from "../lib/config.js";
import { configSetModelCommand } from "../commands/config.js";
import type { HarnessConfig } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = join(
    tmpdir(),
    `harness-f058-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

const BASELINE_CONFIG: HarnessConfig = {
  ...DEFAULT_CONFIG,
  models: {
    default: "claude-original-default",
    planner: "claude-planner",
    generator: "claude-generator",
    evaluator: "claude-evaluator",
  },
};

// ---------------------------------------------------------------------------
// F058 — configSetModelCommand export
// ---------------------------------------------------------------------------

describe("F058 — configSetModelCommand export", () => {
  it("configSetModelCommand is exported as a function from commands/config.tsx", () => {
    expect(typeof configSetModelCommand).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// F058 — configSetModelCommand updates models.default
// ---------------------------------------------------------------------------

describe("F058 — configSetModelCommand updates config.models.default", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    configPath = join(tempDir, "config.json");
    writeConfig(BASELINE_CONFIG, configPath);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it("updates models.default to the given model name", () => {
    configSetModelCommand("claude-opus-4-6", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.default).toBe("claude-opus-4-6");
  });

  it("leaves models.planner unchanged after updating models.default", () => {
    configSetModelCommand("claude-opus-4-6", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.planner).toBe("claude-planner");
  });

  it("leaves models.generator unchanged after updating models.default", () => {
    configSetModelCommand("claude-opus-4-6", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.generator).toBe("claude-generator");
  });

  it("leaves models.evaluator unchanged after updating models.default", () => {
    configSetModelCommand("claude-opus-4-6", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.evaluator).toBe("claude-evaluator");
  });

  it("persists the update to disk", () => {
    configSetModelCommand("claude-sonnet-4-5", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.default).toBe("claude-sonnet-4-5");
  });

  it("supports updating to any model name string", () => {
    configSetModelCommand("my-custom-model-v2", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.default).toBe("my-custom-model-v2");
  });
});

// ---------------------------------------------------------------------------
// F058 — configSetModelCommand prints a success message
// ---------------------------------------------------------------------------

describe("F058 — configSetModelCommand prints a success message", () => {
  let tempDir: string;
  let configPath: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = makeTempDir();
    configPath = join(tempDir, "config.json");
    writeConfig(BASELINE_CONFIG, configPath);
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it("prints a success message to stdout", () => {
    configSetModelCommand("claude-opus-4-6", configPath);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("success message includes the model name", () => {
    configSetModelCommand("claude-opus-4-6", configPath);
    const calls = consoleSpy.mock.calls.flat().join(" ");
    expect(calls).toContain("claude-opus-4-6");
  });

  it("success message indicates the update was successful", () => {
    configSetModelCommand("claude-opus-4-6", configPath);
    const calls = consoleSpy.mock.calls.flat().join(" ");
    // Should contain some indication of success (✓, updated, saved, etc.)
    expect(calls).toMatch(/updated|saved|✓/i);
  });
});

// ---------------------------------------------------------------------------
// F058 — CLI router: config set model routing
// ---------------------------------------------------------------------------

describe("F058 — CLI router handles config set model subcommand", () => {
  it("commands/config.tsx source exports configSetModelCommand", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../commands/config.tsx"), "utf-8");
    expect(src).toContain("export function configSetModelCommand");
  });

  it("commands/config.tsx source calls setConfigKey for models.default", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../commands/config.tsx"), "utf-8");
    expect(src).toContain("models.default");
  });

  it("index.tsx source imports configSetModelCommand", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../index.tsx"), "utf-8");
    expect(src).toContain("configSetModelCommand");
  });

  it("index.tsx source routes config set model to configSetModelCommand", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../index.tsx"), "utf-8");
    expect(src).toContain('"set"');
    expect(src).toContain('"model"');
    expect(src).toContain("configSetModelCommand");
  });
});
