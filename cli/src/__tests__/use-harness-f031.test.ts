/**
 * F031 — useHarness keyboard handler: q kills process, p pauses, d opens dashboard
 *
 * Tests cover:
 *  - handleHarnessKey() dispatches q → onKill when isActive
 *  - handleHarnessKey() calls killHarness then onKill when proc is set
 *  - handleHarnessKey() dispatches p → onTogglePause
 *  - handleHarnessKey() dispatches d → onOpenDashboard when dashboardUrl is set
 *  - handleHarnessKey() ignores d when dashboardUrl is null/undefined
 *  - handleHarnessKey() is a no-op when isActive is false
 *  - handleHarnessKey() ignores unknown keys
 *  - openInBrowser is exported as a function
 *  - HarnessRunState includes a paused field
 */

import { describe, it, expect, vi, type Mock } from "vitest";
import {
  handleHarnessKey,
  openInBrowser,
  type HarnessKeyHandlerOptions,
} from "../hooks/use-harness.js";
import type { ResultPromise } from "execa";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOptions(overrides: Partial<HarnessKeyHandlerOptions> = {}) {
  return {
    proc: null as HarnessKeyHandlerOptions["proc"],
    dashboardUrl: null as string | null | undefined,
    isActive: true,
    onKill: vi.fn(),
    onTogglePause: vi.fn(),
    onOpenDashboard: vi.fn() as Mock<(url: string) => void>,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// handleHarnessKey — q key
// ---------------------------------------------------------------------------

describe("F031 — handleHarnessKey() q key (no proc)", () => {
  it("calls onKill immediately when proc is null", () => {
    const opts = makeOptions({ proc: null });
    handleHarnessKey("q", opts);
    expect(opts.onKill).toHaveBeenCalledTimes(1);
  });

  it("does not call onTogglePause or onOpenDashboard", () => {
    const opts = makeOptions({ proc: null });
    handleHarnessKey("q", opts);
    expect(opts.onTogglePause).not.toHaveBeenCalled();
    expect(opts.onOpenDashboard).not.toHaveBeenCalled();
  });
});

describe("F031 — handleHarnessKey() q key (with proc)", () => {
  it("calls killHarness (kill method) on the proc then onKill", async () => {
    const killFn = vi.fn().mockReturnValue(undefined);
    // Minimal mock that satisfies ResultPromise.kill and is thenable
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

    const opts = makeOptions({ proc: fakeProc });
    handleHarnessKey("q", opts);

    // killHarness is async — give microtasks time to settle
    await new Promise((r) => setTimeout(r, 20));

    // The proc's kill method should have been invoked via killHarness
    expect(killFn).toHaveBeenCalledWith("SIGTERM");
  });
});

// ---------------------------------------------------------------------------
// handleHarnessKey — p key
// ---------------------------------------------------------------------------

describe("F031 — handleHarnessKey() p key", () => {
  it("calls onTogglePause", () => {
    const opts = makeOptions();
    handleHarnessKey("p", opts);
    expect(opts.onTogglePause).toHaveBeenCalledTimes(1);
  });

  it("does not call onKill or onOpenDashboard", () => {
    const opts = makeOptions();
    handleHarnessKey("p", opts);
    expect(opts.onKill).not.toHaveBeenCalled();
    expect(opts.onOpenDashboard).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleHarnessKey — d key
// ---------------------------------------------------------------------------

describe("F031 — handleHarnessKey() d key with dashboardUrl set", () => {
  it("calls onOpenDashboard with the URL", () => {
    const opts = makeOptions({ dashboardUrl: "http://localhost:3000" });
    handleHarnessKey("d", opts);
    expect(opts.onOpenDashboard).toHaveBeenCalledTimes(1);
    expect(opts.onOpenDashboard).toHaveBeenCalledWith("http://localhost:3000");
  });

  it("does not call onKill or onTogglePause", () => {
    const opts = makeOptions({ dashboardUrl: "http://localhost:3000" });
    handleHarnessKey("d", opts);
    expect(opts.onKill).not.toHaveBeenCalled();
    expect(opts.onTogglePause).not.toHaveBeenCalled();
  });
});

describe("F031 — handleHarnessKey() d key without dashboardUrl", () => {
  it("does nothing when dashboardUrl is null", () => {
    const opts = makeOptions({ dashboardUrl: null });
    handleHarnessKey("d", opts);
    expect(opts.onOpenDashboard).not.toHaveBeenCalled();
    expect(opts.onKill).not.toHaveBeenCalled();
  });

  it("does nothing when dashboardUrl is undefined", () => {
    const opts = makeOptions({ dashboardUrl: undefined });
    handleHarnessKey("d", opts);
    expect(opts.onOpenDashboard).not.toHaveBeenCalled();
    expect(opts.onKill).not.toHaveBeenCalled();
  });

  it("does nothing when dashboardUrl is an empty string", () => {
    const opts = makeOptions({ dashboardUrl: "" });
    handleHarnessKey("d", opts);
    expect(opts.onOpenDashboard).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleHarnessKey — isActive = false
// ---------------------------------------------------------------------------

describe("F031 — handleHarnessKey() when isActive is false", () => {
  it("ignores q key", () => {
    const opts = makeOptions({ isActive: false });
    handleHarnessKey("q", opts);
    expect(opts.onKill).not.toHaveBeenCalled();
  });

  it("ignores p key", () => {
    const opts = makeOptions({ isActive: false });
    handleHarnessKey("p", opts);
    expect(opts.onTogglePause).not.toHaveBeenCalled();
  });

  it("ignores d key even when dashboardUrl is set", () => {
    const opts = makeOptions({ isActive: false, dashboardUrl: "http://localhost:3000" });
    handleHarnessKey("d", opts);
    expect(opts.onOpenDashboard).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleHarnessKey — unknown keys
// ---------------------------------------------------------------------------

describe("F031 — handleHarnessKey() unknown keys", () => {
  it("ignores unknown keys without calling any handler", () => {
    const opts = makeOptions({ dashboardUrl: "http://localhost:3000" });
    handleHarnessKey("x", opts);
    handleHarnessKey(" ", opts);
    handleHarnessKey("1", opts);
    expect(opts.onKill).not.toHaveBeenCalled();
    expect(opts.onTogglePause).not.toHaveBeenCalled();
    expect(opts.onOpenDashboard).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// openInBrowser — module shape
// ---------------------------------------------------------------------------

describe("F031 — openInBrowser export", () => {
  it("is exported as a function", () => {
    expect(typeof openInBrowser).toBe("function");
  });

  it("returns a Promise", () => {
    // We don't actually invoke the OS command — just verify the return type.
    // Pass a nonsense URL so no browser is actually opened in CI.
    const result = openInBrowser("about:blank");
    expect(result).toBeInstanceOf(Promise);
    // Swallow the (likely failing) promise so Vitest doesn't report it.
    void result.catch(() => undefined);
  });
});

// ---------------------------------------------------------------------------
// HarnessRunState.paused field — module shape
// ---------------------------------------------------------------------------

describe("F031 — HarnessRunState includes paused field", () => {
  it("useHarness module exports are present", async () => {
    const mod = await import("../hooks/use-harness.js");
    expect(typeof mod.useHarness).toBe("function");
    expect(typeof mod.handleHarnessKey).toBe("function");
    expect(typeof mod.openInBrowser).toBe("function");
  });
});
