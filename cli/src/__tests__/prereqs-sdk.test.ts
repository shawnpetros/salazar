/**
 * F012 — Check claude-agent-sdk installation via python3 import
 *
 * Tests for the checkSdk() function in lib/prereqs.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";

// We mock node:child_process so we can simulate different outcomes
// without actually spawning subprocesses.
vi.mock("node:child_process");

const mockedExecSync = vi.mocked(execSync);

describe("F012 — checkSdk()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns { passed: true, version } when claude_agent_sdk is installed", async () => {
    mockedExecSync.mockReturnValue("1.2.3\n");
    const { checkSdk } = await import("../lib/prereqs.js");
    const result = checkSdk();
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.version).toBe("1.2.3");
    }
  });

  it("returns { passed: true, version } with a different version string", async () => {
    mockedExecSync.mockReturnValue("0.9.1\n");
    const { checkSdk } = await import("../lib/prereqs.js");
    const result = checkSdk();
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.version).toBe("0.9.1");
    }
  });

  it("returns { passed: false, hint } when ImportError is raised (package not installed)", async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error(
        "ModuleNotFoundError: No module named 'claude_agent_sdk'",
      );
    });
    const { checkSdk } = await import("../lib/prereqs.js");
    const result = checkSdk();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBe("pip install claude-agent-sdk");
    }
  });

  it("returns { passed: false, hint } when python3 is not found", async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error("python3: command not found");
    });
    const { checkSdk } = await import("../lib/prereqs.js");
    const result = checkSdk();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBe("pip install claude-agent-sdk");
    }
  });

  it("returns { passed: false, hint } when output is empty", async () => {
    mockedExecSync.mockReturnValue("");
    const { checkSdk } = await import("../lib/prereqs.js");
    const result = checkSdk();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBe("pip install claude-agent-sdk");
    }
  });

  it("hint instructs user to pip install the correct package name", async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error("ImportError");
    });
    const { checkSdk } = await import("../lib/prereqs.js");
    const result = checkSdk();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toContain("pip install");
      expect(result.hint).toContain("claude-agent-sdk");
    }
  });
});
