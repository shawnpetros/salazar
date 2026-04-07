import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, saveConfig } from "../config.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("config", () => {
  let origHome: string | undefined;
  let tmpDir: string;

  beforeEach(() => {
    origHome = process.env.SALAZAR_HOME;
    tmpDir = mkdtempSync(join(tmpdir(), "salazar-test-"));
    process.env.SALAZAR_HOME = tmpDir;
  });

  afterEach(() => {
    if (origHome) process.env.SALAZAR_HOME = origHome;
    else delete process.env.SALAZAR_HOME;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns defaults when no config file exists", () => {
    const config = loadConfig();
    expect(config.models.default).toBe("claude-sonnet-4-6");
  });

  it("round-trips save and load", () => {
    const config = loadConfig();
    config.models.evaluator = "claude-opus-4-6";
    saveConfig(config);
    const loaded = loadConfig();
    expect(loaded.models.evaluator).toBe("claude-opus-4-6");
  });
});
