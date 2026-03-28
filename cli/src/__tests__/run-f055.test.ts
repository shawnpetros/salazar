/**
 * F055 — Keyboard q: kill harness process and exit immediately with code 1
 *
 * Tests cover:
 *  - Pressing q with no proc calls process.exit(1) via onKill
 *  - Pressing q does NOT call process.exit(0)
 *  - Pressing q with a running proc invokes killHarness (SIGTERM) then process.exit(1)
 *  - killHarness is called before exit when a proc is present
 *  - q key is a no-op when isActive is false
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleHarnessKey } from "../hooks/use-harness.js";
import type { ResultPromise } from "execa";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExitOnKill() {
  return () => process.exit(1);
}

// ---------------------------------------------------------------------------
// F055 — q key exits with code 1 (no proc)
// ---------------------------------------------------------------------------

describe("F055 — q key exits with code 1 (no proc)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exitSpy: any;

  beforeEach(() => {
    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    exitSpy.mockRestore();
  });

  it("calls process.exit(1) when q is pressed and proc is null", () => {
    handleHarnessKey("q", {
      proc: null,
      isActive: true,
      onKill: makeExitOnKill(),
      onTogglePause: vi.fn(),
      onOpenDashboard: vi.fn(),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(exitSpy).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("does NOT call process.exit(0) when q is pressed", () => {
    handleHarnessKey("q", {
      proc: null,
      isActive: true,
      onKill: makeExitOnKill(),
      onTogglePause: vi.fn(),
      onOpenDashboard: vi.fn(),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(exitSpy).not.toHaveBeenCalledWith(0);
  });
});

// ---------------------------------------------------------------------------
// F055 — q key calls killHarness then exits with code 1 (proc running)
// ---------------------------------------------------------------------------

describe("F055 — q key kills process then exits with code 1 (proc running)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exitSpy: any;

  beforeEach(() => {
    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    exitSpy.mockRestore();
  });

  it("calls SIGTERM on the proc before calling process.exit(1)", async () => {
    const killFn = vi.fn().mockReturnValue(undefined);
    const fakeProc = {
      kill: killFn,
      then: (resolve: () => void) => {
        resolve();
        return fakeProc;
      },
      catch: () => fakeProc,
      finally: (cb: () => void) => {
        cb();
        return fakeProc;
      },
    } as unknown as ResultPromise;

    handleHarnessKey("q", {
      proc: fakeProc,
      isActive: true,
      onKill: makeExitOnKill(),
      onTogglePause: vi.fn(),
      onOpenDashboard: vi.fn(),
    });

    // Allow microtasks / promise chain to settle
    await new Promise<void>((resolve) => setTimeout(resolve, 20));

    expect(killFn).toHaveBeenCalledWith("SIGTERM");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits with code 1 (not 0) after killing the proc", async () => {
    const killFn = vi.fn().mockReturnValue(undefined);
    const fakeProc = {
      kill: killFn,
      then: (resolve: () => void) => {
        resolve();
        return fakeProc;
      },
      catch: () => fakeProc,
      finally: (cb: () => void) => {
        cb();
        return fakeProc;
      },
    } as unknown as ResultPromise;

    handleHarnessKey("q", {
      proc: fakeProc,
      isActive: true,
      onKill: makeExitOnKill(),
      onTogglePause: vi.fn(),
      onOpenDashboard: vi.fn(),
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 20));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(exitSpy).not.toHaveBeenCalledWith(0);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// F055 — q key is a no-op when isActive is false
// ---------------------------------------------------------------------------

describe("F055 — q key is suppressed when isActive is false", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exitSpy: any;

  beforeEach(() => {
    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    exitSpy.mockRestore();
  });

  it("does not call process.exit when isActive is false", () => {
    handleHarnessKey("q", {
      proc: null,
      isActive: false,
      onKill: makeExitOnKill(),
      onTogglePause: vi.fn(),
      onOpenDashboard: vi.fn(),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// F055 — use-harness.ts source structure: onKill calls process.exit(1)
// ---------------------------------------------------------------------------

describe("F055 — useHarness hook source wires onKill to process.exit(1)", () => {
  it("use-harness.ts source contains process.exit(1) in the onKill handler", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../hooks/use-harness.ts"), "utf-8");
    // The onKill callback should call process.exit(1), not process.exit(0)
    expect(src).toContain("process.exit(1)");
  });

  it("use-harness.ts onKill does NOT call process.exit(0)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../hooks/use-harness.ts"), "utf-8");
    // Ensure no process.exit(0) call exists in this file
    expect(src).not.toContain("process.exit(0)");
  });
});
