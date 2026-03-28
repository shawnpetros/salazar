/**
 * F025 — Create log directory and return log file path for a new session
 *
 * Tests for the createLogPath() function in lib/process.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";

// Mock the node:fs module so we don't touch the real filesystem.
vi.mock("node:fs");

describe("F025 — createLogPath()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls fs.mkdirSync with the ~/.harness/logs path and recursive: true", async () => {
    const fs = await import("node:fs");
    const mockedMkdirSync = vi.mocked(fs.mkdirSync);

    const { createLogPath } = await import("../lib/process.js");
    createLogPath("test-session");

    const expectedDir = path.join(os.homedir(), ".harness", "logs");
    expect(mockedMkdirSync).toHaveBeenCalledWith(expectedDir, {
      recursive: true,
    });
  });

  it("returns the path ~/.harness/logs/<sessionId>.log", async () => {
    const { createLogPath } = await import("../lib/process.js");
    const sessionId = "abc-123";
    const result = createLogPath(sessionId);

    const expectedPath = path.join(
      os.homedir(),
      ".harness",
      "logs",
      `${sessionId}.log`
    );
    expect(result).toBe(expectedPath);
  });

  it("uses the sessionId as the log filename stem", async () => {
    const { createLogPath } = await import("../lib/process.js");
    const sessionId = "my-unique-session-id";
    const result = createLogPath(sessionId);

    expect(path.basename(result)).toBe(`${sessionId}.log`);
  });

  it("places the log file inside the ~/.harness/logs/ directory", async () => {
    const { createLogPath } = await import("../lib/process.js");
    const result = createLogPath("session-xyz");

    const expectedDir = path.join(os.homedir(), ".harness", "logs");
    expect(path.dirname(result)).toBe(expectedDir);
  });

  it("creates the directory before returning the path", async () => {
    const fs = await import("node:fs");
    const mockedMkdirSync = vi.mocked(fs.mkdirSync);
    let mkdirCalledBeforeReturn = false;

    mockedMkdirSync.mockImplementation(() => {
      mkdirCalledBeforeReturn = true;
      return undefined;
    });

    const { createLogPath } = await import("../lib/process.js");
    createLogPath("order-test");

    expect(mkdirCalledBeforeReturn).toBe(true);
  });

  it("works with different sessionId values each returning a unique path", async () => {
    const { createLogPath } = await import("../lib/process.js");

    const path1 = createLogPath("session-1");
    const path2 = createLogPath("session-2");

    expect(path1).not.toBe(path2);
    expect(path1).toContain("session-1.log");
    expect(path2).toContain("session-2.log");
  });
});
