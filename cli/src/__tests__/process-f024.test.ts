/**
 * F024 — Spawn Python harness process via execa with spec path and CLI flags
 *
 * Tests for the spawnHarness() function in lib/process.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock execa so we never actually spawn a Python process in tests.
vi.mock("execa");

describe("F024 — spawnHarness()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls execa with 'python3' as the executable", async () => {
    const { execa } = await import("execa");
    const mockedExeca = vi.mocked(execa);
    const fakeHandle = { pid: 1234 } as unknown as ReturnType<typeof execa>;
    mockedExeca.mockReturnValue(fakeHandle);

    const { spawnHarness } = await import("../lib/process.js");
    spawnHarness("spec.md", {});

    expect(mockedExeca).toHaveBeenCalledOnce();
    const [executable] = mockedExeca.mock.calls[0] as [string, string[]];
    expect(executable).toBe("python3");
  });

  it("includes '-m' and 'harness' as the first two arguments", async () => {
    const { execa } = await import("execa");
    const mockedExeca = vi.mocked(execa);
    const fakeHandle = { pid: 1234 } as unknown as ReturnType<typeof execa>;
    mockedExeca.mockReturnValue(fakeHandle);

    const { spawnHarness } = await import("../lib/process.js");
    spawnHarness("spec.md", {});

    const [, args] = mockedExeca.mock.calls[0] as [string, string[]];
    expect(args[0]).toBe("-m");
    expect(args[1]).toBe("harness");
  });

  it("passes specPath as the third argument", async () => {
    const { execa } = await import("execa");
    const mockedExeca = vi.mocked(execa);
    const fakeHandle = { pid: 1234 } as unknown as ReturnType<typeof execa>;
    mockedExeca.mockReturnValue(fakeHandle);

    const { spawnHarness } = await import("../lib/process.js");
    spawnHarness("spec.md", {});

    const [, args] = mockedExeca.mock.calls[0] as [string, string[]];
    expect(args[2]).toBe("spec.md");
  });

  it("appends --model flag when model option is provided", async () => {
    const { execa } = await import("execa");
    const mockedExeca = vi.mocked(execa);
    const fakeHandle = { pid: 1234 } as unknown as ReturnType<typeof execa>;
    mockedExeca.mockReturnValue(fakeHandle);

    const { spawnHarness } = await import("../lib/process.js");
    spawnHarness("spec.md", { model: "claude-sonnet-4-6" });

    const [, args] = mockedExeca.mock.calls[0] as [string, string[]];
    const modelIdx = args.indexOf("--model");
    expect(modelIdx).toBeGreaterThan(-1);
    expect(args[modelIdx + 1]).toBe("claude-sonnet-4-6");
  });

  it("appends --log flag when logPath option is provided", async () => {
    const { execa } = await import("execa");
    const mockedExeca = vi.mocked(execa);
    const fakeHandle = { pid: 1234 } as unknown as ReturnType<typeof execa>;
    mockedExeca.mockReturnValue(fakeHandle);

    const { spawnHarness } = await import("../lib/process.js");
    spawnHarness("spec.md", { logPath: "/tmp/run.log" });

    const [, args] = mockedExeca.mock.calls[0] as [string, string[]];
    const logIdx = args.indexOf("--log");
    expect(logIdx).toBeGreaterThan(-1);
    expect(args[logIdx + 1]).toBe("/tmp/run.log");
  });

  it("passes both --model and --log flags when both options are provided", async () => {
    const { execa } = await import("execa");
    const mockedExeca = vi.mocked(execa);
    const fakeHandle = { pid: 1234 } as unknown as ReturnType<typeof execa>;
    mockedExeca.mockReturnValue(fakeHandle);

    const { spawnHarness } = await import("../lib/process.js");
    spawnHarness("spec.md", {
      model: "claude-sonnet-4-6",
      logPath: "/tmp/run.log",
    });

    const [, args] = mockedExeca.mock.calls[0] as [string, string[]];
    expect(args).toContain("--model");
    expect(args).toContain("claude-sonnet-4-6");
    expect(args).toContain("--log");
    expect(args).toContain("/tmp/run.log");
  });

  it("omits --model flag when model option is not provided", async () => {
    const { execa } = await import("execa");
    const mockedExeca = vi.mocked(execa);
    const fakeHandle = { pid: 1234 } as unknown as ReturnType<typeof execa>;
    mockedExeca.mockReturnValue(fakeHandle);

    const { spawnHarness } = await import("../lib/process.js");
    spawnHarness("spec.md", { logPath: "/tmp/run.log" });

    const [, args] = mockedExeca.mock.calls[0] as [string, string[]];
    expect(args).not.toContain("--model");
  });

  it("omits --log flag when logPath option is not provided", async () => {
    const { execa } = await import("execa");
    const mockedExeca = vi.mocked(execa);
    const fakeHandle = { pid: 1234 } as unknown as ReturnType<typeof execa>;
    mockedExeca.mockReturnValue(fakeHandle);

    const { spawnHarness } = await import("../lib/process.js");
    spawnHarness("spec.md", { model: "claude-sonnet-4-6" });

    const [, args] = mockedExeca.mock.calls[0] as [string, string[]];
    expect(args).not.toContain("--log");
  });

  it("returns the ExecaChildProcess handle from execa", async () => {
    const { execa } = await import("execa");
    const mockedExeca = vi.mocked(execa);
    const fakeHandle = {
      pid: 5678,
      stdout: null,
      stderr: null,
    } as unknown as ReturnType<typeof execa>;
    mockedExeca.mockReturnValue(fakeHandle);

    const { spawnHarness } = await import("../lib/process.js");
    const result = spawnHarness("spec.md", {
      model: "claude-sonnet-4-6",
      logPath: "/tmp/run.log",
    });

    expect(result).toBe(fakeHandle);
  });

  it("works with default empty options when no options argument is supplied", async () => {
    const { execa } = await import("execa");
    const mockedExeca = vi.mocked(execa);
    const fakeHandle = { pid: 9999 } as unknown as ReturnType<typeof execa>;
    mockedExeca.mockReturnValue(fakeHandle);

    const { spawnHarness } = await import("../lib/process.js");
    // Should not throw
    expect(() => spawnHarness("spec.md")).not.toThrow();

    const [, args] = mockedExeca.mock.calls[0] as [string, string[]];
    // Only the base args: -m, harness, spec.md
    expect(args).toEqual(["-m", "harness", "spec.md"]);
  });
});
