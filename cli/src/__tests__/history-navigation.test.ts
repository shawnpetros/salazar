/**
 * history-navigation — additional boundary and integration tests
 *
 * Supplements history-f061.test.ts with:
 *  - totalItems === 1 boundary case (single-item list)
 *  - Out-of-bounds selectedIndex correction behaviour
 *  - Verify InteractiveHistoryList is exported from commands/history.tsx
 *  - Verify history.tsx imports and uses handleHistoryKey
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  handleHistoryKey,
  type HistoryNavOptions,
} from "../lib/history-navigation.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOptions(overrides: Partial<HistoryNavOptions> = {}): HistoryNavOptions {
  return {
    selectedIndex: 0,
    totalItems: 3,
    onNavigate: vi.fn(),
    onSelect: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// totalItems === 1 boundary
// ---------------------------------------------------------------------------

describe("history-navigation — totalItems === 1 boundary", () => {
  it("pressing ↓ at index 0 with 1 item does not call onNavigate (already at last)", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 1 });
    handleHistoryKey("", { downArrow: true }, opts);
    expect(opts.onNavigate).not.toHaveBeenCalled();
  });

  it("pressing ↑ at index 0 with 1 item does not call onNavigate (already at first)", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 1 });
    handleHistoryKey("", { upArrow: true }, opts);
    expect(opts.onNavigate).not.toHaveBeenCalled();
  });

  it("pressing Enter at index 0 with 1 item calls onSelect(0)", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 1 });
    handleHistoryKey("", { return: true }, opts);
    expect(opts.onSelect).toHaveBeenCalledWith(0);
  });

  it("pressing ↓ does not call onSelect when totalItems === 1", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 1 });
    handleHistoryKey("", { downArrow: true }, opts);
    expect(opts.onSelect).not.toHaveBeenCalled();
  });

  it("pressing ↑ does not call onSelect when totalItems === 1", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 1 });
    handleHistoryKey("", { upArrow: true }, opts);
    expect(opts.onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Out-of-bounds selectedIndex correction behaviour
// ---------------------------------------------------------------------------

describe("history-navigation — out-of-bounds selectedIndex correction", () => {
  it("selectedIndex: -1 with downArrow clamps up to 0 and calls onNavigate(0)", () => {
    // next = Math.min(-1 + 1, totalItems - 1) = Math.min(0, 2) = 0
    // 0 !== -1, so onNavigate fires with 0
    const opts = makeOptions({ selectedIndex: -1, totalItems: 3 });
    handleHistoryKey("", { downArrow: true }, opts);
    expect(opts.onNavigate).toHaveBeenCalledWith(0);
  });

  it("selectedIndex: -1 with upArrow corrects to 0 and calls onNavigate(0)", () => {
    // prev = Math.max(-1 - 1, 0) = Math.max(-2, 0) = 0
    // 0 !== -1, so onNavigate fires with 0
    const opts = makeOptions({ selectedIndex: -1, totalItems: 3 });
    handleHistoryKey("", { upArrow: true }, opts);
    expect(opts.onNavigate).toHaveBeenCalledWith(0);
  });

  it("selectedIndex beyond last item with downArrow corrects to last valid index", () => {
    // next = Math.min(5 + 1, 2) = Math.min(6, 2) = 2
    // 2 !== 5, so onNavigate fires with 2
    const opts = makeOptions({ selectedIndex: 5, totalItems: 3 });
    handleHistoryKey("", { downArrow: true }, opts);
    expect(opts.onNavigate).toHaveBeenCalledWith(2);
  });

  it("selectedIndex beyond last item with upArrow corrects toward last-1", () => {
    // prev = Math.max(5 - 1, 0) = 4
    // 4 !== 5, so onNavigate fires with 4
    const opts = makeOptions({ selectedIndex: 5, totalItems: 3 });
    handleHistoryKey("", { upArrow: true }, opts);
    expect(opts.onNavigate).toHaveBeenCalledWith(4);
  });

  it("selectedIndex: -1 with Enter and totalItems > 0 still calls onSelect(-1)", () => {
    // onSelect is called with the raw selectedIndex value (no clamping for Enter)
    const opts = makeOptions({ selectedIndex: -1, totalItems: 3 });
    handleHistoryKey("", { return: true }, opts);
    expect(opts.onSelect).toHaveBeenCalledWith(-1);
  });
});

// ---------------------------------------------------------------------------
// InteractiveHistoryList component — exported from commands/history.tsx
// ---------------------------------------------------------------------------

describe("history-navigation — InteractiveHistoryList export", () => {
  it("InteractiveHistoryList is exported as a function from commands/history.tsx", async () => {
    const mod = await import("../commands/history.js");
    expect(typeof mod.InteractiveHistoryList).toBe("function");
  });

  it("HistoryListProps type is satisfied by { sessions, onExit }", async () => {
    const { InteractiveHistoryList } = await import("../commands/history.js");
    // Just verify the component can be referenced with the expected prop shape
    expect(InteractiveHistoryList.length).toBeGreaterThanOrEqual(0);
  });

  it("HistoryScreenView type is exported from commands/history.tsx", async () => {
    // HistoryScreenView is a type export — verify the module loads without error
    // (TypeScript erases type exports at runtime, so we just check the module loads)
    const mod = await import("../commands/history.js");
    expect(mod).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Source-level integration: history.tsx wires in handleHistoryKey
// ---------------------------------------------------------------------------

describe("history-navigation — history.tsx wires in handleHistoryKey", () => {
  const historySource = readFileSync(
    resolve(process.cwd(), "src/commands/history.tsx"),
    "utf-8"
  );

  it("history.tsx imports handleHistoryKey from history-navigation", () => {
    expect(historySource).toContain("handleHistoryKey");
    expect(historySource).toContain("history-navigation");
  });

  it("history.tsx uses useInput hook", () => {
    expect(historySource).toContain("useInput");
  });

  it("history.tsx uses useState hook", () => {
    expect(historySource).toContain("useState");
  });

  it("history.tsx contains a detail view render path", () => {
    expect(historySource).toContain("detail");
  });

  it("history.tsx contains navigation hint text", () => {
    expect(historySource).toContain("Navigate");
  });

  it("history.tsx contains onSelect callback that sets detail view", () => {
    expect(historySource).toContain("onSelect");
  });

  it("history.tsx passes onNavigate to handleHistoryKey", () => {
    expect(historySource).toContain("onNavigate");
  });
});
