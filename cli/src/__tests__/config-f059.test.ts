/**
 * F059 — config set dashboard-url and dashboard-secret subcommands
 *
 * Verifies that:
 *  - configSetDashboardUrlCommand is exported from commands/config.tsx
 *  - configSetDashboardSecretCommand is exported from commands/config.tsx
 *  - configSetDashboardUrlCommand updates dashboard.url in the config file
 *  - configSetDashboardSecretCommand updates dashboard.secret in the config file
 *  - Other config keys remain unchanged after each update
 *  - Success messages are printed to stdout
 *  - The CLI router handles `harness config set dashboard-url <url>` and
 *    `harness config set dashboard-secret <secret>`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readConfig, writeConfig, DEFAULT_CONFIG } from "../lib/config.js";
import {
  configSetDashboardUrlCommand,
  configSetDashboardSecretCommand,
} from "../commands/config.js";
import type { HarnessConfig } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  const dir = join(
    tmpdir(),
    `harness-f059-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
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
  dashboard: {
    url: "http://localhost:3000",
    secret: "original-secret",
  },
};

// ---------------------------------------------------------------------------
// F059 — exports
// ---------------------------------------------------------------------------

describe("F059 — configSetDashboardUrlCommand export", () => {
  it("configSetDashboardUrlCommand is exported as a function from commands/config.tsx", () => {
    expect(typeof configSetDashboardUrlCommand).toBe("function");
  });
});

describe("F059 — configSetDashboardSecretCommand export", () => {
  it("configSetDashboardSecretCommand is exported as a function from commands/config.tsx", () => {
    expect(typeof configSetDashboardSecretCommand).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// F059 — configSetDashboardUrlCommand updates dashboard.url
// ---------------------------------------------------------------------------

describe("F059 — configSetDashboardUrlCommand updates config.dashboard.url", () => {
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

  it("updates dashboard.url to the given URL", () => {
    configSetDashboardUrlCommand("https://dash.example.com", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.url).toBe("https://dash.example.com");
  });

  it("persists the dashboard.url update to disk", () => {
    configSetDashboardUrlCommand("https://new-dash.example.com", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.url).toBe("https://new-dash.example.com");
  });

  it("leaves dashboard.secret unchanged after updating dashboard.url", () => {
    configSetDashboardUrlCommand("https://dash.example.com", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.secret).toBe("original-secret");
  });

  it("leaves models.default unchanged after updating dashboard.url", () => {
    configSetDashboardUrlCommand("https://dash.example.com", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.default).toBe("claude-original-default");
  });

  it("supports updating to any valid URL string", () => {
    configSetDashboardUrlCommand("https://another.example.org/dashboard", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.url).toBe("https://another.example.org/dashboard");
  });
});

// ---------------------------------------------------------------------------
// F059 — configSetDashboardSecretCommand updates dashboard.secret
// ---------------------------------------------------------------------------

describe("F059 — configSetDashboardSecretCommand updates config.dashboard.secret", () => {
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

  it("updates dashboard.secret to the given secret", () => {
    configSetDashboardSecretCommand("abc123", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.secret).toBe("abc123");
  });

  it("persists the dashboard.secret update to disk", () => {
    configSetDashboardSecretCommand("mysecrettoken", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.secret).toBe("mysecrettoken");
  });

  it("leaves dashboard.url unchanged after updating dashboard.secret", () => {
    configSetDashboardSecretCommand("abc123", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.url).toBe("http://localhost:3000");
  });

  it("leaves models.default unchanged after updating dashboard.secret", () => {
    configSetDashboardSecretCommand("abc123", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.models.default).toBe("claude-original-default");
  });

  it("supports updating to any secret string", () => {
    configSetDashboardSecretCommand("super-secret-token-xyz", configPath);
    const cfg = readConfig(configPath);
    expect(cfg.dashboard.secret).toBe("super-secret-token-xyz");
  });
});

// ---------------------------------------------------------------------------
// F059 — success messages
// ---------------------------------------------------------------------------

describe("F059 — configSetDashboardUrlCommand prints a success message", () => {
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
    configSetDashboardUrlCommand("https://dash.example.com", configPath);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("success message includes the URL", () => {
    configSetDashboardUrlCommand("https://dash.example.com", configPath);
    const calls = consoleSpy.mock.calls.flat().join(" ");
    expect(calls).toContain("https://dash.example.com");
  });

  it("success message indicates the update was successful", () => {
    configSetDashboardUrlCommand("https://dash.example.com", configPath);
    const calls = consoleSpy.mock.calls.flat().join(" ");
    expect(calls).toMatch(/updated|saved|✓/i);
  });
});

describe("F059 — configSetDashboardSecretCommand prints a success message", () => {
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
    configSetDashboardSecretCommand("abc123", configPath);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("success message indicates the update was successful", () => {
    configSetDashboardSecretCommand("abc123", configPath);
    const calls = consoleSpy.mock.calls.flat().join(" ");
    expect(calls).toMatch(/updated|saved|✓/i);
  });
});

// ---------------------------------------------------------------------------
// F059 — CLI router: config set dashboard-url / dashboard-secret routing
// ---------------------------------------------------------------------------

describe("F059 — CLI router handles config set dashboard-url subcommand", () => {
  it("commands/config.tsx source exports configSetDashboardUrlCommand", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../commands/config.tsx"), "utf-8");
    expect(src).toContain("export function configSetDashboardUrlCommand");
  });

  it("commands/config.tsx source calls setConfigKey for dashboard.url", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../commands/config.tsx"), "utf-8");
    expect(src).toContain("dashboard.url");
  });

  it("index.tsx source imports configSetDashboardUrlCommand", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../index.tsx"), "utf-8");
    expect(src).toContain("configSetDashboardUrlCommand");
  });

  it("index.tsx source routes config set dashboard-url to configSetDashboardUrlCommand", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../index.tsx"), "utf-8");
    expect(src).toContain('"dashboard-url"');
    expect(src).toContain("configSetDashboardUrlCommand");
  });
});

describe("F059 — CLI router handles config set dashboard-secret subcommand", () => {
  it("commands/config.tsx source exports configSetDashboardSecretCommand", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../commands/config.tsx"), "utf-8");
    expect(src).toContain("export function configSetDashboardSecretCommand");
  });

  it("commands/config.tsx source calls setConfigKey for dashboard.secret", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../commands/config.tsx"), "utf-8");
    expect(src).toContain("dashboard.secret");
  });

  it("index.tsx source imports configSetDashboardSecretCommand", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../index.tsx"), "utf-8");
    expect(src).toContain("configSetDashboardSecretCommand");
  });

  it("index.tsx source routes config set dashboard-secret to configSetDashboardSecretCommand", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../index.tsx"), "utf-8");
    expect(src).toContain('"dashboard-secret"');
    expect(src).toContain("configSetDashboardSecretCommand");
  });
});
