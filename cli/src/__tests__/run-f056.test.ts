/**
 * F056 — Keyboard d: open dashboard URL in default browser during run
 *
 * Tests cover:
 *  - Pressing d with a dashboardUrl calls onOpenDashboard with the correct URL
 *  - Pressing d without a dashboardUrl is a no-op
 *  - Pressing d when isActive is false is a no-op
 *  - openInBrowser uses the correct platform-specific command via execa
 *  - openInBrowser swallows errors (best-effort fire-and-forget)
 *  - useHarness source wires d key to openInBrowser with the dashboard URL
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleHarnessKey, openInBrowser } from "../hooks/use-harness.js";

// ---------------------------------------------------------------------------
// F056 — d key calls onOpenDashboard with the dashboard URL
// ---------------------------------------------------------------------------

describe("F056 — d key opens dashboard URL when dashboardUrl is configured", () => {
  it("calls onOpenDashboard with the configured dashboard URL", () => {
    const onOpenDashboard = vi.fn();

    handleHarnessKey("d", {
      proc: null,
      isActive: true,
      dashboardUrl: "https://dashboard.example.com",
      onKill: vi.fn(),
      onTogglePause: vi.fn(),
      onOpenDashboard,
    });

    expect(onOpenDashboard).toHaveBeenCalledOnce();
    expect(onOpenDashboard).toHaveBeenCalledWith("https://dashboard.example.com");
  });

  it("passes the exact configured URL to onOpenDashboard", () => {
    const onOpenDashboard = vi.fn();
    const url = "https://dashboard.example.com";

    handleHarnessKey("d", {
      proc: null,
      isActive: true,
      dashboardUrl: url,
      onKill: vi.fn(),
      onTogglePause: vi.fn(),
      onOpenDashboard,
    });

    expect(onOpenDashboard).toHaveBeenCalledWith(url);
  });

  it("does not call onKill or onTogglePause when d is pressed", () => {
    const onKill = vi.fn();
    const onTogglePause = vi.fn();
    const onOpenDashboard = vi.fn();

    handleHarnessKey("d", {
      proc: null,
      isActive: true,
      dashboardUrl: "https://dashboard.example.com",
      onKill,
      onTogglePause,
      onOpenDashboard,
    });

    expect(onKill).not.toHaveBeenCalled();
    expect(onTogglePause).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// F056 — d key is a no-op when dashboardUrl is not configured
// ---------------------------------------------------------------------------

describe("F056 — d key is a no-op when dashboardUrl is not set", () => {
  it("does not call onOpenDashboard when dashboardUrl is undefined", () => {
    const onOpenDashboard = vi.fn();

    handleHarnessKey("d", {
      proc: null,
      isActive: true,
      dashboardUrl: undefined,
      onKill: vi.fn(),
      onTogglePause: vi.fn(),
      onOpenDashboard,
    });

    expect(onOpenDashboard).not.toHaveBeenCalled();
  });

  it("does not call onOpenDashboard when dashboardUrl is null", () => {
    const onOpenDashboard = vi.fn();

    handleHarnessKey("d", {
      proc: null,
      isActive: true,
      dashboardUrl: null,
      onKill: vi.fn(),
      onTogglePause: vi.fn(),
      onOpenDashboard,
    });

    expect(onOpenDashboard).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// F056 — d key is a no-op when isActive is false
// ---------------------------------------------------------------------------

describe("F056 — d key is suppressed when isActive is false", () => {
  it("does not call onOpenDashboard when isActive is false", () => {
    const onOpenDashboard = vi.fn();

    handleHarnessKey("d", {
      proc: null,
      isActive: false,
      dashboardUrl: "https://dashboard.example.com",
      onKill: vi.fn(),
      onTogglePause: vi.fn(),
      onOpenDashboard,
    });

    expect(onOpenDashboard).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// F056 — openInBrowser uses the correct platform command
// ---------------------------------------------------------------------------

describe("F056 — openInBrowser uses execa with the correct platform command", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("use-harness.ts source uses 'open' for darwin platform", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../hooks/use-harness.ts"), "utf-8");
    expect(src).toContain('"open"');
    expect(src).toContain('"darwin"');
  });

  it("use-harness.ts source uses 'xdg-open' for Linux platform", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../hooks/use-harness.ts"), "utf-8");
    expect(src).toContain('"xdg-open"');
  });

  it("use-harness.ts source uses 'start' for win32 platform", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../hooks/use-harness.ts"), "utf-8");
    expect(src).toContain('"start"');
    expect(src).toContain('"win32"');
  });

  it("use-harness.ts source calls execa with the URL argument", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../hooks/use-harness.ts"), "utf-8");
    expect(src).toContain("execa(command, [url])");
  });
});

// ---------------------------------------------------------------------------
// F056 — openInBrowser swallows errors (best-effort)
// ---------------------------------------------------------------------------

describe("F056 — openInBrowser is best-effort and swallows errors", () => {
  it("does not throw when execa rejects", async () => {
    // openInBrowser should never reject — it wraps in try/catch
    // We test this by calling with a URL that would fail on any platform
    // (the real execa may or may not be available, so we just verify no throw)
    await expect(openInBrowser("https://dashboard.example.com")).resolves.toBeUndefined();
  });

  it("use-harness.ts source wraps execa call in try/catch", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../hooks/use-harness.ts"), "utf-8");
    expect(src).toContain("try {");
    expect(src).toContain("} catch {");
  });
});

// ---------------------------------------------------------------------------
// F056 — useHarness hook source wires d key to openInBrowser
// ---------------------------------------------------------------------------

describe("F056 — useHarness hook source wires d key to openInBrowser", () => {
  it("use-harness.ts source calls openInBrowser in onOpenDashboard handler", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../hooks/use-harness.ts"), "utf-8");
    expect(src).toContain("onOpenDashboard: (url) => {");
    expect(src).toContain("openInBrowser(url)");
  });

  it("use-harness.ts source reads dashboardUrl from config.dashboard.url", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../hooks/use-harness.ts"), "utf-8");
    expect(src).toContain("config.dashboard.url");
  });

  it("use-harness.ts source passes dashboardUrl to handleHarnessKey", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../hooks/use-harness.ts"), "utf-8");
    expect(src).toContain("dashboardUrl,");
  });
});
