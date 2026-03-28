/**
 * F027 — Kill harness Python process gracefully on SIGINT or explicit kill()
 *
 * Tests for the killHarness() function in lib/process.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ResultPromise } from "execa";

// Mock execa so we never actually spawn a Python process in tests.
vi.mock("execa");

describe("F027 — killHarness()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls proc.kill() with SIGTERM", async () => {
    const { killHarness } = await import("../lib/process.js");

    const killMock = vi.fn();
    const fakeProc = {
      kill: killMock,
      // Promise that resolves immediately (simulates process exiting cleanly)
      then: (resolve: (value: unknown) => void) => Promise.resolve().then(resolve),
      catch: (reject: (err: unknown) => void) => Promise.resolve().catch(reject),
    } as unknown as ResultPromise;

    await killHarness(fakeProc);

    expect(killMock).toHaveBeenCalledWith("SIGTERM");
  });

  it("resolves without throwing when the process exits normally", async () => {
    const { killHarness } = await import("../lib/process.js");

    const fakeProc = {
      kill: vi.fn(),
      then: (resolve: (value: unknown) => void) => Promise.resolve().then(resolve),
      catch: (fn: (err: unknown) => void) => Promise.resolve().catch(fn),
    } as unknown as ResultPromise;

    await expect(killHarness(fakeProc)).resolves.toBeUndefined();
  });

  it("resolves without throwing when the process rejects (already killed)", async () => {
    const { killHarness } = await import("../lib/process.js");

    // Simulate a process that rejects (as execa does when killed)
    const rejectedPromise = Promise.reject(new Error("Process was killed"));
    const fakeProc = {
      kill: vi.fn(),
      then: rejectedPromise.then.bind(rejectedPromise),
      catch: rejectedPromise.catch.bind(rejectedPromise),
    } as unknown as ResultPromise;

    // Should not throw even though the underlying promise rejected
    await expect(killHarness(fakeProc)).resolves.toBeUndefined();
  });

  it("resolves without throwing when proc.kill() throws synchronously", async () => {
    const { killHarness } = await import("../lib/process.js");

    const fakeProc = {
      kill: vi.fn().mockImplementation(() => {
        throw new Error("ESRCH: no such process");
      }),
      then: (resolve: (value: unknown) => void) => Promise.resolve().then(resolve),
      catch: (fn: (err: unknown) => void) => Promise.resolve().catch(fn),
    } as unknown as ResultPromise;

    // Should not throw even if kill() itself throws
    await expect(killHarness(fakeProc)).resolves.toBeUndefined();
  });

  it("returns a Promise", async () => {
    const { killHarness } = await import("../lib/process.js");

    const fakeProc = {
      kill: vi.fn(),
      then: (resolve: (value: unknown) => void) => Promise.resolve().then(resolve),
      catch: (fn: (err: unknown) => void) => Promise.resolve().catch(fn),
    } as unknown as ResultPromise;

    const result = killHarness(fakeProc);
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  it("can be used as a SIGINT handler without throwing", async () => {
    const { killHarness } = await import("../lib/process.js");

    const fakeProc = {
      kill: vi.fn(),
      then: (resolve: (value: unknown) => void) => Promise.resolve().then(resolve),
      catch: (fn: (err: unknown) => void) => Promise.resolve().catch(fn),
    } as unknown as ResultPromise;

    // Simulate what a SIGINT handler would do
    const handler = () => killHarness(fakeProc);
    await expect(handler()).resolves.toBeUndefined();
  });
});
