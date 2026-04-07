import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { detectValidators, allPassed, formatFailures } from "../validators.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ValidationResult } from "../../lib/types.js";

describe("detectValidators", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "salazar-val-"));
  });
  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects npm as default package manager", () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
      scripts: { test: "vitest run", build: "tsc" }
    }));
    const config = detectValidators(tmpDir);
    expect(config.packageManager).toBe("npm");
    expect(config.test).toBe("npm run test");
    expect(config.build).toBe("npm run build");
  });

  it("detects pnpm from lockfile", () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ scripts: { test: "vitest" } }));
    writeFileSync(join(tmpDir, "pnpm-lock.yaml"), "");
    const config = detectValidators(tmpDir);
    expect(config.packageManager).toBe("pnpm");
    expect(config.test).toBe("pnpm run test");
  });

  it("falls back to npx tsc --noEmit for typecheck", () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ scripts: {} }));
    const config = detectValidators(tmpDir);
    expect(config.typecheck).toBe("npx tsc --noEmit");
  });

  it("detects custom typecheck script names", () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
      scripts: { "check:types": "tsc --noEmit" }
    }));
    const config = detectValidators(tmpDir);
    expect(config.typecheck).toBe("npm run check:types");
  });

  it("returns nulls when no package.json exists", () => {
    const config = detectValidators(tmpDir);
    expect(config.typecheck).toBeNull();
    expect(config.lint).toBeNull();
    expect(config.build).toBeNull();
    expect(config.test).toBeNull();
  });
});

describe("allPassed", () => {
  it("returns true when all pass", () => {
    const results: ValidationResult[] = [
      { name: "typecheck", passed: true, output: "" },
      { name: "test", passed: true, output: "" },
    ];
    expect(allPassed(results)).toBe(true);
  });

  it("returns false when any fails", () => {
    const results: ValidationResult[] = [
      { name: "typecheck", passed: true, output: "" },
      { name: "test", passed: false, output: "1 test failed" },
    ];
    expect(allPassed(results)).toBe(false);
  });
});

describe("formatFailures", () => {
  it("formats failed results", () => {
    const results: ValidationResult[] = [
      { name: "typecheck", passed: true, output: "ok" },
      { name: "lint", passed: false, output: "error: no-unused-vars" },
    ];
    const formatted = formatFailures(results);
    expect(formatted).toContain("## lint FAILED");
    expect(formatted).toContain("no-unused-vars");
    expect(formatted).not.toContain("typecheck");
  });

  it("returns all-passed message when none failed", () => {
    const results: ValidationResult[] = [
      { name: "typecheck", passed: true, output: "ok" },
    ];
    expect(formatFailures(results)).toContain("passed");
  });
});
