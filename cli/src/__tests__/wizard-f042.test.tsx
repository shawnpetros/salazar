/**
 * F042 — Wizard saves config and marks first-run as complete after ready screen
 *
 * Verifies that:
 *  - app.tsx imports writeConfig from lib/config
 *  - app.tsx calls writeConfig inside the config-save handler (handleConfigSave)
 *  - The config persisted by writeConfig causes isFirstRun() to return false
 *  - The HarnessConfig written contains the WizardConfig values (generatorModel,
 *    evaluatorModel, dashboardUrl, dashboardSecret)
 *  - Calling writeConfig() then isFirstRun() with a temp path returns false
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Source-level assertions
// ---------------------------------------------------------------------------

async function loadAppSource(): Promise<string> {
  const { readFileSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const srcRoot = resolve(__dirname, "..");
  return readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
}

describe("F042 — app.tsx source: writeConfig integration", () => {
  it("app.tsx imports writeConfig from lib/config", async () => {
    const content = await loadAppSource();
    expect(content).toMatch(/writeConfig/);
    expect(content).toMatch(/from.*lib\/config/);
  });

  it("app.tsx imports DEFAULT_CONFIG from lib/config", async () => {
    const content = await loadAppSource();
    expect(content).toContain("DEFAULT_CONFIG");
  });

  it("app.tsx calls writeConfig in the config save handler", async () => {
    const content = await loadAppSource();
    expect(content).toMatch(/writeConfig\s*\(/);
  });

  it("app.tsx maps generatorModel into HarnessConfig.models.generator", async () => {
    const content = await loadAppSource();
    expect(content).toContain("generatorModel");
    expect(content).toMatch(/generator.*generatorModel|generatorModel.*generator/s);
  });

  it("app.tsx maps evaluatorModel into HarnessConfig.models.evaluator", async () => {
    const content = await loadAppSource();
    expect(content).toContain("evaluatorModel");
    expect(content).toMatch(/evaluator.*evaluatorModel|evaluatorModel.*evaluator/s);
  });

  it("app.tsx maps dashboardUrl into HarnessConfig.dashboard.url", async () => {
    const content = await loadAppSource();
    expect(content).toContain("dashboardUrl");
    expect(content).toMatch(/url.*dashboardUrl|dashboardUrl.*url/s);
  });

  it("app.tsx maps dashboardSecret into HarnessConfig.dashboard.secret", async () => {
    const content = await loadAppSource();
    expect(content).toContain("dashboardSecret");
    expect(content).toMatch(/secret.*dashboardSecret|dashboardSecret.*secret/s);
  });
});

// ---------------------------------------------------------------------------
// Functional: writeConfig + isFirstRun round-trip
// ---------------------------------------------------------------------------

describe("F042 — writeConfig persists config; isFirstRun() returns false after", () => {
  it("isFirstRun() returns true when no config file exists", async () => {
    const { isFirstRun } = await import("../lib/config.js");
    const tmpDir = mkdtempSync(join(tmpdir(), "harness-f042-"));
    try {
      const configPath = join(tmpDir, "config.json");
      expect(isFirstRun(configPath)).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("writeConfig() creates the config file and isFirstRun() then returns false", async () => {
    const { isFirstRun, writeConfig, DEFAULT_CONFIG } = await import(
      "../lib/config.js"
    );
    const tmpDir = mkdtempSync(join(tmpdir(), "harness-f042-"));
    try {
      const configPath = join(tmpDir, "config.json");
      expect(isFirstRun(configPath)).toBe(true);
      writeConfig(DEFAULT_CONFIG, configPath);
      expect(isFirstRun(configPath)).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("writeConfig() persists WizardConfig values into HarnessConfig fields", async () => {
    const { writeConfig, readConfig, DEFAULT_CONFIG, isFirstRun } =
      await import("../lib/config.js");
    const tmpDir = mkdtempSync(join(tmpdir(), "harness-f042-"));
    try {
      const configPath = join(tmpDir, "config.json");

      // Simulate what handleConfigSave does in app.tsx
      const wizardConfig = {
        generatorModel: "claude-sonnet-4-5",
        evaluatorModel: "claude-haiku-3-5",
        dashboardUrl: "http://example.com:4000",
        dashboardSecret: "super-secret",
      };

      const harnessConfig = {
        ...DEFAULT_CONFIG,
        models: {
          ...DEFAULT_CONFIG.models,
          generator: wizardConfig.generatorModel,
          evaluator: wizardConfig.evaluatorModel,
        },
        dashboard: {
          url: wizardConfig.dashboardUrl,
          secret: wizardConfig.dashboardSecret,
        },
      };

      writeConfig(harnessConfig, configPath);

      // isFirstRun should now be false
      expect(isFirstRun(configPath)).toBe(false);

      // The persisted config should contain the wizard values
      const saved = readConfig(configPath);
      expect(saved.models.generator).toBe("claude-sonnet-4-5");
      expect(saved.models.evaluator).toBe("claude-haiku-3-5");
      expect(saved.dashboard.url).toBe("http://example.com:4000");
      expect(saved.dashboard.secret).toBe("super-secret");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("writeConfig() creates parent directory if it does not exist", async () => {
    const { writeConfig, isFirstRun, DEFAULT_CONFIG } = await import(
      "../lib/config.js"
    );
    const tmpDir = mkdtempSync(join(tmpdir(), "harness-f042-"));
    try {
      // Nested path that doesn't exist yet
      const configPath = join(tmpDir, "nested", "deep", "config.json");
      expect(isFirstRun(configPath)).toBe(true);
      writeConfig(DEFAULT_CONFIG, configPath);
      expect(isFirstRun(configPath)).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
