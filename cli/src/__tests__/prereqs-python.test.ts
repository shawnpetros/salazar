/**
 * F011 — Check Python 3.11+ availability for prerequisites
 *
 * Tests for the checkPython() function in lib/prereqs.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";

// We mock node:child_process so we can simulate different python versions
// without actually spawning subprocesses.
vi.mock("node:child_process");

const mockedExecSync = vi.mocked(execSync);

describe("F011 — checkPython()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns { passed: true, version } when Python 3.11.x", async () => {
    mockedExecSync.mockReturnValue("Python 3.11.2\n");
    const { checkPython } = await import("../lib/prereqs.js");
    const result = checkPython();
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.version).toBe("3.11.2");
    }
  });

  it("returns { passed: true, version } when Python 3.12.x", async () => {
    mockedExecSync.mockReturnValue("Python 3.12.0\n");
    const { checkPython } = await import("../lib/prereqs.js");
    const result = checkPython();
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.version).toBe("3.12.0");
    }
  });

  it("returns { passed: true, version } when Python 3.13.1", async () => {
    mockedExecSync.mockReturnValue("Python 3.13.1\n");
    const { checkPython } = await import("../lib/prereqs.js");
    const result = checkPython();
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.version).toBe("3.13.1");
    }
  });

  it("returns { passed: false, hint } when Python 3.10 (below minimum)", async () => {
    mockedExecSync.mockReturnValue("Python 3.10.6\n");
    const { checkPython } = await import("../lib/prereqs.js");
    const result = checkPython();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBe("Install Python 3.11+");
    }
  });

  it("returns { passed: false, hint } when Python 3.9", async () => {
    mockedExecSync.mockReturnValue("Python 3.9.7\n");
    const { checkPython } = await import("../lib/prereqs.js");
    const result = checkPython();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBe("Install Python 3.11+");
    }
  });

  it("returns { passed: false, hint } when python3 command throws", async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error("python3: command not found");
    });
    const { checkPython } = await import("../lib/prereqs.js");
    const result = checkPython();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBe("Install Python 3.11+");
    }
  });

  it("returns { passed: false, hint } when version string is unparseable", async () => {
    mockedExecSync.mockReturnValue("not-a-version\n");
    const { checkPython } = await import("../lib/prereqs.js");
    const result = checkPython();
    expect(result.passed).toBe(false);
    if (!result.passed) {
      expect(result.hint).toBe("Install Python 3.11+");
    }
  });

  it("version string contains only the numeric version (no 'Python' prefix)", async () => {
    mockedExecSync.mockReturnValue("Python 3.11.9\n");
    const { checkPython } = await import("../lib/prereqs.js");
    const result = checkPython();
    expect(result.passed).toBe(true);
    if (result.passed) {
      expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(result.version).not.toContain("Python");
    }
  });
});
