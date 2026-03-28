/**
 * F010 — Check Node.js version >= 20 for prerequisites
 *
 * Tests for the checkNode() function in lib/prereqs.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";

// We mock node:child_process so we can simulate different node versions
// without actually spawning subprocesses.
vi.mock("node:child_process");

const mockedExecSync = vi.mocked(execSync);

describe("F010 — checkNode()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns { passed: true, version } when Node.js major >= 20", async () => {
    mockedExecSync.mockReturnValue("v20.0.0\n");
    const { checkNode } = await import("../lib/prereqs.js");
    const result = checkNode();
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.version).toBe("v20.0.0");
    }
  });

  it("returns { passed: true, version } for Node.js v22", async () => {
    mockedExecSync.mockReturnValue("v22.3.1\n");
    const { checkNode } = await import("../lib/prereqs.js");
    const result = checkNode();
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.version).toBe("v22.3.1");
    }
  });

  it("returns { passed: false, hint } when major < 20", async () => {
    mockedExecSync.mockReturnValue("v18.12.0\n");
    const { checkNode } = await import("../lib/prereqs.js");
    const result = checkNode();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toContain("18");
      expect(result.hint).toContain("20");
    }
  });

  it("returns { passed: false, hint } for very old Node.js (v10)", async () => {
    mockedExecSync.mockReturnValue("v10.0.0\n");
    const { checkNode } = await import("../lib/prereqs.js");
    const result = checkNode();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBeTruthy();
    }
  });

  it("returns { passed: false, hint } when node command throws", async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error("node: command not found");
    });
    const { checkNode } = await import("../lib/prereqs.js");
    const result = checkNode();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toContain("Node.js");
    }
  });

  it("returns { passed: false, hint } when version string is unparseable", async () => {
    mockedExecSync.mockReturnValue("not-a-version\n");
    const { checkNode } = await import("../lib/prereqs.js");
    const result = checkNode();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBeTruthy();
    }
  });

  it("trims whitespace from the version string", async () => {
    mockedExecSync.mockReturnValue("  v20.1.0\n  ");
    const { checkNode } = await import("../lib/prereqs.js");
    const result = checkNode();
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.version).toBe("v20.1.0");
    }
  });

  it("returns a version string starting with 'v' on success", async () => {
    mockedExecSync.mockReturnValue("v21.7.3\n");
    const { checkNode } = await import("../lib/prereqs.js");
    const result = checkNode();
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.version).toMatch(/^v\d+\.\d+\.\d+$/);
    }
  });
});
