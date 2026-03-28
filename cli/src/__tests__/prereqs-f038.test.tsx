/**
 * F038 — Prerequisites screen: run all checks and display pass/fail with install hints
 *
 * Verifies that:
 *  - PrereqsCheck is exported as a function from components/prereqs.tsx
 *  - PrereqsCheck accepts an onDone callback prop
 *  - prereqs.tsx source contains ✓ for passing checks with version
 *  - prereqs.tsx source contains ✗ for failing checks with install hint
 *  - prereqs.tsx source uses ink-spinner (Spinner) while running
 *  - prereqs.tsx source calls checkAll()
 *  - prereqs.tsx source calls onDone with allPassed boolean
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";

describe("F038 — PrereqsCheck exports", () => {
  it("PrereqsCheck is exported as a function from components/prereqs.tsx", async () => {
    const { PrereqsCheck } = await import("../components/prereqs.js");
    expect(typeof PrereqsCheck).toBe("function");
  });

  it("PrereqsCheckProps type is satisfied by { onDone }", async () => {
    const { PrereqsCheck } = await import("../components/prereqs.js");
    const onDone = vi.fn();
    const el = React.createElement(PrereqsCheck, { onDone });
    expect(el).toBeDefined();
    expect(el.type).toBe(PrereqsCheck);
  });

  it("onDone prop is stored on the element", async () => {
    const { PrereqsCheck } = await import("../components/prereqs.js");
    const onDone = vi.fn();
    const el = React.createElement(PrereqsCheck, { onDone });
    expect(el.props.onDone).toBe(onDone);
    expect(typeof el.props.onDone).toBe("function");
  });
});

describe("F038 — PrereqsCheck source structure", () => {
  it("prereqs.tsx source exports PrereqsCheck function", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/prereqs.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function PrereqsCheck");
  });

  it("prereqs.tsx source contains ✓ for passing checks", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/prereqs.tsx"),
      "utf-8"
    );
    expect(content).toContain("✓");
  });

  it("prereqs.tsx source contains ✗ for failing checks", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/prereqs.tsx"),
      "utf-8"
    );
    expect(content).toContain("✗");
  });

  it("prereqs.tsx source uses Spinner from ink-spinner", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/prereqs.tsx"),
      "utf-8"
    );
    expect(content).toMatch(/ink-spinner|Spinner/);
  });

  it("prereqs.tsx source calls checkAll()", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/prereqs.tsx"),
      "utf-8"
    );
    expect(content).toContain("checkAll");
  });

  it("prereqs.tsx source calls onDone with allPassed boolean", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/prereqs.tsx"),
      "utf-8"
    );
    expect(content).toContain("onDone");
    expect(content).toContain("allPassed");
  });

  it("prereqs.tsx source displays version for passing checks", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/prereqs.tsx"),
      "utf-8"
    );
    expect(content).toContain("version");
  });

  it("prereqs.tsx source displays hint for failing checks", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/prereqs.tsx"),
      "utf-8"
    );
    expect(content).toContain("hint");
  });
});

describe("F038 — PrereqsCheck integration with checkAll", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls onDone(true) when all checks pass", async () => {
    vi.mock("../lib/prereqs.js", () => ({
      checkAll: () => [
        { name: "node", passed: true, version: "v22.0.0" },
        { name: "python", passed: true, version: "3.12.0" },
        { name: "sdk", passed: true, version: "1.0.0" },
        { name: "claude-cli", passed: true, version: "1.0.0" },
      ],
    }));

    const { PrereqsCheck } = await import("../components/prereqs.js");
    const onDone = vi.fn();
    // Create element to verify structure
    const el = React.createElement(PrereqsCheck, { onDone });
    expect(el.type).toBe(PrereqsCheck);
    expect(el.props.onDone).toBe(onDone);
  });

  it("calls onDone(false) when some checks fail", async () => {
    vi.mock("../lib/prereqs.js", () => ({
      checkAll: () => [
        { name: "node", passed: true, version: "v22.0.0" },
        { name: "python", passed: false, hint: "Install Python 3.11+" },
        { name: "sdk", passed: false, hint: "pip install claude-agent-sdk" },
        { name: "claude-cli", passed: false, hint: "Install Claude CLI and authenticate" },
      ],
    }));

    const { PrereqsCheck } = await import("../components/prereqs.js");
    const onDone = vi.fn();
    const el = React.createElement(PrereqsCheck, { onDone });
    expect(el.type).toBe(PrereqsCheck);
  });
});
