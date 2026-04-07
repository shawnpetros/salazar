import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readProgress, nextIncomplete, formatProgressHeader } from "../progress.js";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("progress", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "salazar-progress-"));
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when no feature_list.json exists", () => {
    expect(readProgress(tmpDir)).toBeNull();
  });

  it("reads wrapped format { features: [...] }", () => {
    writeFileSync(join(tmpDir, "feature_list.json"), JSON.stringify({
      features: [
        { id: "F001", category: "setup", description: "Init", priority: 1, complexity: "setup", steps: [], passes: true },
        { id: "F002", category: "core", description: "Core", priority: 2, complexity: "moderate", steps: [], passes: false },
        { id: "F003", category: "core", description: "More", priority: 3, complexity: "simple", steps: [], passes: false },
      ]
    }));
    const report = readProgress(tmpDir)!;
    expect(report.total).toBe(3);
    expect(report.passing).toBe(1);
    expect(report.percent).toBeCloseTo(33.33, 1);
    expect(report.isComplete).toBe(false);
  });

  it("reads bare array format [...]", () => {
    writeFileSync(join(tmpDir, "feature_list.json"), JSON.stringify([
      { id: "F001", passes: true },
      { id: "F002", passes: true },
    ]));
    const report = readProgress(tmpDir)!;
    expect(report.total).toBe(2);
    expect(report.passing).toBe(2);
    expect(report.isComplete).toBe(true);
  });

  it("nextIncomplete returns first non-passing feature", () => {
    writeFileSync(join(tmpDir, "feature_list.json"), JSON.stringify({
      features: [
        { id: "F001", passes: true },
        { id: "F002", passes: false, description: "next one" },
        { id: "F003", passes: false },
      ]
    }));
    const report = readProgress(tmpDir)!;
    const next = nextIncomplete(report)!;
    expect(next.id).toBe("F002");
  });

  it("nextIncomplete returns null when all pass", () => {
    writeFileSync(join(tmpDir, "feature_list.json"), JSON.stringify({
      features: [{ id: "F001", passes: true }]
    }));
    const report = readProgress(tmpDir)!;
    expect(nextIncomplete(report)).toBeNull();
  });

  it("formatProgressHeader shows correct format", () => {
    writeFileSync(join(tmpDir, "feature_list.json"), JSON.stringify({
      features: [
        { id: "F001", passes: true },
        { id: "F002", passes: false },
      ]
    }));
    const report = readProgress(tmpDir)!;
    expect(formatProgressHeader(report)).toBe("Progress: 1/2 features passing (50%)\n");
  });
});
