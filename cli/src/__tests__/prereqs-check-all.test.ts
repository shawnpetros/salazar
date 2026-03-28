/**
 * F014 — Aggregate prerequisites check into a single result with per-check status
 *
 * Tests for the checkAll() function in lib/prereqs.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";

vi.mock("node:child_process");

const mockedExecSync = vi.mocked(execSync);

describe("F014 — checkAll()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns an array", async () => {
    mockedExecSync.mockReturnValue("v22.0.0\n");
    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();
    expect(Array.isArray(results)).toBe(true);
  });

  it("returns exactly four results (node, python, sdk, claude-cli)", async () => {
    mockedExecSync.mockReturnValue("v22.0.0\n");
    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();
    expect(results).toHaveLength(4);
  });

  it("each result has a non-empty string name field", async () => {
    mockedExecSync.mockReturnValue("v22.0.0\n");
    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();
    for (const r of results) {
      expect(typeof r.name).toBe("string");
      expect(r.name.length).toBeGreaterThan(0);
    }
  });

  it("each result has a boolean passed field", async () => {
    mockedExecSync.mockReturnValue("v22.0.0\n");
    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();
    for (const r of results) {
      expect(typeof r.passed).toBe("boolean");
    }
  });

  it("results are ordered: node, python, sdk, claude-cli", async () => {
    mockedExecSync.mockReturnValue("v22.0.0\n");
    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();
    expect(results[0].name).toBe("node");
    expect(results[1].name).toBe("python");
    expect(results[2].name).toBe("sdk");
    expect(results[3].name).toBe("claude-cli");
  });

  it("sets version on results where the check passes", async () => {
    // Provide valid responses for node and python; simulate sdk/claude failures
    mockedExecSync
      .mockReturnValueOnce("v22.1.0\n")       // node --version
      .mockReturnValueOnce("Python 3.12.0\n")  // python3 --version
      .mockImplementationOnce(() => { throw new Error("not found"); }) // sdk
      .mockImplementationOnce(() => { throw new Error("not found"); }); // claude-cli

    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();

    const nodeResult = results.find(r => r.name === "node");
    expect(nodeResult?.passed).toBe(true);
    expect(typeof nodeResult?.version).toBe("string");

    const pythonResult = results.find(r => r.name === "python");
    expect(pythonResult?.passed).toBe(true);
    expect(typeof pythonResult?.version).toBe("string");
  });

  it("sets hint on results where the check fails", async () => {
    // Simulate all checks failing
    mockedExecSync.mockImplementation(() => {
      throw new Error("command not found");
    });

    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();

    for (const r of results) {
      expect(r.passed).toBe(false);
      expect(typeof r.hint).toBe("string");
      expect((r.hint ?? "").length).toBeGreaterThan(0);
    }
  });

  it("does not set hint on passing results", async () => {
    mockedExecSync
      .mockReturnValueOnce("v22.0.0\n")       // node --version (passes)
      .mockImplementationOnce(() => { throw new Error(); }) // python (fails)
      .mockImplementationOnce(() => { throw new Error(); }) // sdk (fails)
      .mockImplementationOnce(() => { throw new Error(); }); // claude-cli (fails)

    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();

    const nodeResult = results.find(r => r.name === "node");
    expect(nodeResult?.passed).toBe(true);
    expect(nodeResult?.hint).toBeUndefined();
  });

  it("does not set version on failing results", async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error("command not found");
    });

    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();

    for (const r of results) {
      expect(r.version).toBeUndefined();
    }
  });

  it("node result carries the parsed version string on success", async () => {
    mockedExecSync
      .mockReturnValueOnce("v22.1.0\n")
      .mockImplementationOnce(() => { throw new Error(); })
      .mockImplementationOnce(() => { throw new Error(); })
      .mockImplementationOnce(() => { throw new Error(); });

    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();
    const nodeResult = results.find(r => r.name === "node");
    expect(nodeResult?.version).toBe("v22.1.0");
  });

  it("python result carries the parsed version string on success", async () => {
    mockedExecSync
      .mockImplementationOnce(() => { throw new Error(); }) // node fails
      .mockReturnValueOnce("Python 3.12.1\n")              // python passes
      .mockImplementationOnce(() => { throw new Error(); }) // sdk fails
      .mockImplementationOnce(() => { throw new Error(); }); // claude-cli fails

    const { checkAll } = await import("../lib/prereqs.js");
    const results = checkAll();
    const pythonResult = results.find(r => r.name === "python");
    expect(pythonResult?.passed).toBe(true);
    expect(pythonResult?.version).toBe("3.12.1");
  });
});
