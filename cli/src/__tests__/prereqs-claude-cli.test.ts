/**
 * F013 — Check Claude CLI availability and authentication status
 *
 * Tests for the checkClaudeCli() function in lib/prereqs.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";

// We mock node:child_process so we can simulate different outcomes
// without actually spawning subprocesses.
vi.mock("node:child_process");

const mockedExecSync = vi.mocked(execSync);

describe("F013 — checkClaudeCli()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns { passed: true } when claude --version succeeds", async () => {
    mockedExecSync.mockReturnValue("1.0.0\n");
    const { checkClaudeCli } = await import("../lib/prereqs.js");
    const result = checkClaudeCli();
    expect(result.passed).toBe(true);
  });

  it("returns { passed: false, hint } when claude is not installed", async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error("claude: command not found");
    });
    const { checkClaudeCli } = await import("../lib/prereqs.js");
    const result = checkClaudeCli();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBe("Install Claude CLI and authenticate");
    }
  });

  it("returns { passed: false, hint } when the command exits with non-zero", async () => {
    mockedExecSync.mockImplementation(() => {
      const err = new Error("Command failed: claude --version");
      (err as NodeJS.ErrnoException).code = "1";
      throw err;
    });
    const { checkClaudeCli } = await import("../lib/prereqs.js");
    const result = checkClaudeCli();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBe("Install Claude CLI and authenticate");
    }
  });

  it("hint message instructs user to install and authenticate", async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error("not found");
    });
    const { checkClaudeCli } = await import("../lib/prereqs.js");
    const result = checkClaudeCli();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toContain("Install Claude CLI");
      expect(result.hint).toContain("authenticate");
    }
  });

  it("passes regardless of output content as long as command exits 0", async () => {
    mockedExecSync.mockReturnValue("claude/1.2.3 darwin-arm64 node-v20.0.0\n");
    const { checkClaudeCli } = await import("../lib/prereqs.js");
    const result = checkClaudeCli();
    expect(result.passed).toBe(true);
  });
});
