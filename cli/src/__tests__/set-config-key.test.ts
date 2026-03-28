/**
 * F009 — setConfigKey() tests
 *
 * Verifies that setConfigKey() updates a single dot-notation key in the
 * harness config file while leaving all other keys intact.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  setConfigKey,
  readConfig,
  writeConfig,
  DEFAULT_CONFIG,
} from "../lib/config.js";
import type { HarnessConfig } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = join(
    tmpdir(),
    `harness-setkey-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeConfigPath(dir: string): string {
  return join(dir, "config.json");
}

// A baseline config written before each test so a file always exists.
const BASELINE_CONFIG: HarnessConfig = {
  ...DEFAULT_CONFIG,
  models: {
    default: "claude-baseline",
    planner: "claude-planner",
    generator: "claude-generator",
    evaluator: "claude-evaluator",
  },
  dashboard: {
    url: "http://baseline.example.com",
    secret: "baseline-secret",
  },
};

// ---------------------------------------------------------------------------
// F009 — setConfigKey()
// ---------------------------------------------------------------------------

describe("F009 — setConfigKey() basic functionality", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    configPath = makeConfigPath(tempDir);
    writeConfig(BASELINE_CONFIG, configPath);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it("is exported as a function from lib/config.ts", () => {
    expect(typeof setConfigKey).toBe("function");
  });

  it("updates models.default without changing other keys", () => {
    setConfigKey("models.default", "claude-opus-4-6", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.default).toBe("claude-opus-4-6");
  });

  it("leaves models.planner unchanged after updating models.default", () => {
    setConfigKey("models.default", "claude-opus-4-6", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.planner).toBe("claude-planner");
  });

  it("leaves models.generator unchanged after updating models.default", () => {
    setConfigKey("models.default", "claude-opus-4-6", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.generator).toBe("claude-generator");
  });

  it("leaves models.evaluator unchanged after updating models.default", () => {
    setConfigKey("models.default", "claude-opus-4-6", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.evaluator).toBe("claude-evaluator");
  });

  it("leaves dashboard.url unchanged after updating models.default", () => {
    setConfigKey("models.default", "claude-opus-4-6", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.url).toBe("http://baseline.example.com");
  });

  it("leaves dashboard.secret unchanged after updating models.default", () => {
    setConfigKey("models.default", "claude-opus-4-6", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.secret).toBe("baseline-secret");
  });
});

describe("F009 — setConfigKey() different key paths", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    configPath = makeConfigPath(tempDir);
    writeConfig(BASELINE_CONFIG, configPath);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it("updates models.planner via dot-notation key", () => {
    setConfigKey("models.planner", "new-planner-model", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.planner).toBe("new-planner-model");
    // Other model fields should remain unchanged
    expect(cfg.models.default).toBe("claude-baseline");
    expect(cfg.models.generator).toBe("claude-generator");
    expect(cfg.models.evaluator).toBe("claude-evaluator");
  });

  it("updates models.generator via dot-notation key", () => {
    setConfigKey("models.generator", "new-gen-model", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.generator).toBe("new-gen-model");
    expect(cfg.models.default).toBe("claude-baseline");
  });

  it("updates models.evaluator via dot-notation key", () => {
    setConfigKey("models.evaluator", "new-eval-model", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.evaluator).toBe("new-eval-model");
    expect(cfg.models.default).toBe("claude-baseline");
  });

  it("updates dashboard.url via dot-notation key", () => {
    setConfigKey("dashboard.url", "https://new-dashboard.example.com", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.url).toBe("https://new-dashboard.example.com");
    expect(cfg.dashboard.secret).toBe("baseline-secret");
  });

  it("updates dashboard.secret via dot-notation key", () => {
    setConfigKey("dashboard.secret", "new-secret-value", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.secret).toBe("new-secret-value");
    expect(cfg.dashboard.url).toBe("http://baseline.example.com");
  });

  it("updates output.defaultDir via dot-notation key", () => {
    setConfigKey("output.defaultDir", "/my/custom/output", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.output.defaultDir).toBe("/my/custom/output");
    // Other top-level sections remain unchanged
    expect(cfg.models.default).toBe("claude-baseline");
  });

  it("updates python.path via dot-notation key", () => {
    setConfigKey("python.path", "/usr/local/bin/python3.12", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.python.path).toBe("/usr/local/bin/python3.12");
  });
});

describe("F009 — setConfigKey() persistence", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    configPath = makeConfigPath(tempDir);
    writeConfig(BASELINE_CONFIG, configPath);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it("writes the updated value to disk (file content changes)", () => {
    setConfigKey("models.default", "claude-opus-4-6", configPath);
    const content = readFileSync(configPath, "utf-8");
    expect(content).toContain("claude-opus-4-6");
  });

  it("does not leave the original value in the file after update", () => {
    setConfigKey("models.default", "claude-opus-4-6", configPath);
    const content = readFileSync(configPath, "utf-8");
    // 'claude-baseline' should no longer appear for the default field
    const parsed = JSON.parse(content) as HarnessConfig;
    expect(parsed.models.default).toBe("claude-opus-4-6");
    expect(parsed.models.default).not.toBe("claude-baseline");
  });

  it("multiple sequential updates accumulate correctly", () => {
    setConfigKey("models.default", "model-v1", configPath);
    setConfigKey("models.default", "model-v2", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.default).toBe("model-v2");
  });

  it("updating two separate keys both persist correctly", () => {
    setConfigKey("models.default", "updated-default", configPath);
    setConfigKey("dashboard.url", "https://updated.example.com", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.default).toBe("updated-default");
    expect(cfg.dashboard.url).toBe("https://updated.example.com");
    // Unchanged keys remain
    expect(cfg.models.planner).toBe("claude-planner");
    expect(cfg.dashboard.secret).toBe("baseline-secret");
  });
});

describe("F009 — setConfigKey() error handling", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    configPath = makeConfigPath(tempDir);
    writeConfig(BASELINE_CONFIG, configPath);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it("throws when keyPath is an empty string", () => {
    expect(() => setConfigKey("", "some-value", configPath)).toThrow();
  });

  it("throws when an intermediate segment resolves to a non-object", () => {
    // 'models.default' is a string, so trying to descend further should throw
    expect(() =>
      setConfigKey("models.default.extra", "oops", configPath)
    ).toThrow();
  });
});
