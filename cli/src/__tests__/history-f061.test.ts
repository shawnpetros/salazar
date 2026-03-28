/**
 * F061 — history list: arrow-key navigation and Enter for detail view
 *
 * Verifies that:
 *  - handleHistoryKey is exported from lib/history-navigation.ts
 *  - HistoryNavOptions type is exported
 *  - HistoryKeyInput type is exported
 *  - Pressing ↓ (downArrow) moves the cursor to the next item
 *  - Pressing ↑ (upArrow) moves the cursor to the previous item
 *  - Pressing ↓ at the last item does not move the cursor (clamped)
 *  - Pressing ↑ at the first item does not move the cursor (clamped)
 *  - Pressing Enter calls onSelect with the current selectedIndex
 *  - Pressing Enter when totalItems is 0 does not call onSelect
 *  - Pressing ↓ from index 0 in a 3-item list navigates to index 1
 *  - Pressing ↑ from index 2 in a 3-item list navigates to index 1
 *  - Pressing ↓ only calls onNavigate, not onSelect
 *  - Pressing ↑ only calls onNavigate, not onSelect
 *  - Pressing Enter only calls onSelect, not onNavigate
 *  - Unknown keys (arbitrary input) are silently ignored
 *  - Navigation is clamped: from index 1 of 2, pressing ↓ reaches index 1 (last)
 */

import { describe, it, expect, vi } from "vitest";
import {
  handleHistoryKey,
  type HistoryNavOptions,
  type HistoryKeyInput,
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
// Exports
// ---------------------------------------------------------------------------

describe("F061 — handleHistoryKey is exported", () => {
  it("exports handleHistoryKey as a function", async () => {
    const mod = await import("../lib/history-navigation.js");
    expect(typeof mod.handleHistoryKey).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// ↓ downArrow navigation
// ---------------------------------------------------------------------------

describe("F061 — ↓ arrow key moves cursor down", () => {
  it("calls onNavigate with selectedIndex + 1 when pressing ↓", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 3 });
    handleHistoryKey("", { downArrow: true }, opts);
    expect(opts.onNavigate).toHaveBeenCalledWith(1);
  });

  it("moves from index 0 to 1 in a 3-item list", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 3 });
    handleHistoryKey("", { downArrow: true }, opts);
    expect(opts.onNavigate).toHaveBeenCalledOnce();
    expect(opts.onNavigate).toHaveBeenCalledWith(1);
  });

  it("moves from index 1 to 2 in a 3-item list", () => {
    const opts = makeOptions({ selectedIndex: 1, totalItems: 3 });
    handleHistoryKey("", { downArrow: true }, opts);
    expect(opts.onNavigate).toHaveBeenCalledWith(2);
  });

  it("does not call onNavigate when already at the last item", () => {
    const opts = makeOptions({ selectedIndex: 2, totalItems: 3 });
    handleHistoryKey("", { downArrow: true }, opts);
    expect(opts.onNavigate).not.toHaveBeenCalled();
  });

  it("does not call onSelect when ↓ is pressed", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 3 });
    handleHistoryKey("", { downArrow: true }, opts);
    expect(opts.onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ↑ upArrow navigation
// ---------------------------------------------------------------------------

describe("F061 — ↑ arrow key moves cursor up", () => {
  it("calls onNavigate with selectedIndex - 1 when pressing ↑", () => {
    const opts = makeOptions({ selectedIndex: 2, totalItems: 3 });
    handleHistoryKey("", { upArrow: true }, opts);
    expect(opts.onNavigate).toHaveBeenCalledWith(1);
  });

  it("moves from index 2 to 1 in a 3-item list", () => {
    const opts = makeOptions({ selectedIndex: 2, totalItems: 3 });
    handleHistoryKey("", { upArrow: true }, opts);
    expect(opts.onNavigate).toHaveBeenCalledOnce();
    expect(opts.onNavigate).toHaveBeenCalledWith(1);
  });

  it("moves from index 1 to 0 in a 3-item list", () => {
    const opts = makeOptions({ selectedIndex: 1, totalItems: 3 });
    handleHistoryKey("", { upArrow: true }, opts);
    expect(opts.onNavigate).toHaveBeenCalledWith(0);
  });

  it("does not call onNavigate when already at the first item", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 3 });
    handleHistoryKey("", { upArrow: true }, opts);
    expect(opts.onNavigate).not.toHaveBeenCalled();
  });

  it("does not call onSelect when ↑ is pressed", () => {
    const opts = makeOptions({ selectedIndex: 1, totalItems: 3 });
    handleHistoryKey("", { upArrow: true }, opts);
    expect(opts.onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Enter key — detail view navigation
// ---------------------------------------------------------------------------

describe("F061 — Enter key navigates to detail view", () => {
  it("calls onSelect with the current selectedIndex when Enter is pressed", () => {
    const opts = makeOptions({ selectedIndex: 1, totalItems: 3 });
    handleHistoryKey("", { return: true }, opts);
    expect(opts.onSelect).toHaveBeenCalledWith(1);
  });

  it("calls onSelect with index 0 when Enter is pressed on first item", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 3 });
    handleHistoryKey("", { return: true }, opts);
    expect(opts.onSelect).toHaveBeenCalledWith(0);
  });

  it("calls onSelect with last index when Enter is pressed on last item", () => {
    const opts = makeOptions({ selectedIndex: 2, totalItems: 3 });
    handleHistoryKey("", { return: true }, opts);
    expect(opts.onSelect).toHaveBeenCalledWith(2);
  });

  it("does not call onSelect when totalItems is 0", () => {
    const opts = makeOptions({ selectedIndex: 0, totalItems: 0 });
    handleHistoryKey("", { return: true }, opts);
    expect(opts.onSelect).not.toHaveBeenCalled();
  });

  it("does not call onNavigate when Enter is pressed", () => {
    const opts = makeOptions({ selectedIndex: 1, totalItems: 3 });
    handleHistoryKey("", { return: true }, opts);
    expect(opts.onNavigate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Unknown / ignored keys
// ---------------------------------------------------------------------------

describe("F061 — unknown keys are silently ignored", () => {
  it("does not call onNavigate or onSelect for an unknown character key", () => {
    const opts = makeOptions();
    handleHistoryKey("x", {}, opts);
    expect(opts.onNavigate).not.toHaveBeenCalled();
    expect(opts.onSelect).not.toHaveBeenCalled();
  });

  it("does not call onNavigate or onSelect for an empty key event", () => {
    const opts = makeOptions();
    handleHistoryKey("", {}, opts);
    expect(opts.onNavigate).not.toHaveBeenCalled();
    expect(opts.onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Type-shape guards (compile-time checks via usage)
// ---------------------------------------------------------------------------

describe("F061 — HistoryKeyInput and HistoryNavOptions types are usable", () => {
  it("accepts a HistoryKeyInput with only downArrow set", () => {
    const key: HistoryKeyInput = { downArrow: true };
    const opts = makeOptions({ selectedIndex: 0, totalItems: 2 });
    expect(() => handleHistoryKey("", key, opts)).not.toThrow();
  });

  it("accepts a HistoryNavOptions object with all required fields", () => {
    const opts: HistoryNavOptions = {
      selectedIndex: 0,
      totalItems: 1,
      onNavigate: vi.fn(),
      onSelect: vi.fn(),
    };
    expect(() => handleHistoryKey("", {}, opts)).not.toThrow();
  });
});
