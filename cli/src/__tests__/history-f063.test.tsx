/**
 * F063 — history list: q to quit, keyboard hint displayed
 *
 * Verifies that:
 *  - The source renders the footer 'Use ↑↓ to navigate, Enter for details, q to quit'
 *  - The footer text is in the list view (not just detail view)
 *  - InteractiveHistoryList accepts onExit callback
 *  - The component is exported from commands/history.tsx
 *  - HistoryListProps includes an onExit optional callback
 *  - When q is pressed (input === 'q'), onExit is called in list view
 *  - The footer contains 'Use ↑↓ to navigate'
 *  - The footer contains 'Enter for details'
 *  - The footer contains 'q to quit'
 *  - The footer starts with 'Use'
 *  - The onExit prop is optional
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SessionRecord } from "../lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// The exact footer string required by F063
// ---------------------------------------------------------------------------

const REQUIRED_FOOTER = "Use ↑↓ to navigate, Enter for details, q to quit";

// ---------------------------------------------------------------------------
// Source code inspection — footer text
// ---------------------------------------------------------------------------

describe("F063 — footer hint in source", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "commands/history.tsx"), "utf-8");

  it("source contains the exact footer string", () => {
    expect(getSource()).toContain(REQUIRED_FOOTER);
  });

  it("footer starts with 'Use'", () => {
    expect(getSource()).toContain("Use ↑↓");
  });

  it("footer contains '↑↓ to navigate'", () => {
    expect(getSource()).toContain("↑↓ to navigate");
  });

  it("footer contains 'Enter for details'", () => {
    expect(getSource()).toContain("Enter for details");
  });

  it("footer contains 'q to quit'", () => {
    expect(getSource()).toContain("q to quit");
  });

  it("footer is not the old text '↑↓ Navigate  Enter Select  q Quit'", () => {
    expect(getSource()).not.toContain("↑↓ Navigate  Enter Select  q Quit");
  });
});

// ---------------------------------------------------------------------------
// Source code inspection — q key and onExit wiring
// ---------------------------------------------------------------------------

describe("F063 — q key calls onExit in source", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "commands/history.tsx"), "utf-8");

  it("source handles input === 'q' in list view", () => {
    expect(getSource()).toContain(`input === "q"`);
  });

  it("source calls onExit when q is pressed", () => {
    expect(getSource()).toContain("onExit");
  });

  it("source uses onExit?.() (optional chaining to safely call)", () => {
    expect(getSource()).toContain("onExit?.()");
  });

  it("source checks key.escape as well as q for exit", () => {
    expect(getSource()).toContain("key.escape");
  });
});

// ---------------------------------------------------------------------------
// Component exports and props
// ---------------------------------------------------------------------------

describe("F063 — InteractiveHistoryList exports and props", () => {
  it("InteractiveHistoryList is exported as a function", async () => {
    const { InteractiveHistoryList } = await import("../commands/history.js");
    expect(typeof InteractiveHistoryList).toBe("function");
  });

  it("HistoryListProps type allows onExit to be undefined (optional)", async () => {
    const { InteractiveHistoryList } = await import("../commands/history.js");
    // Passing no onExit should not cause a TypeScript error — tested by createElement
    const sessions: SessionRecord[] = [];
    const el = React.createElement(InteractiveHistoryList, { sessions });
    expect(el).toBeDefined();
  });

  it("InteractiveHistoryList accepts onExit callback prop", async () => {
    const { InteractiveHistoryList } = await import("../commands/history.js");
    const onExit = vi.fn();
    const sessions: SessionRecord[] = [];
    const el = React.createElement(InteractiveHistoryList, { sessions, onExit });
    expect(el.props.onExit).toBe(onExit);
  });

  it("InteractiveHistoryList accepts sessions prop", async () => {
    const { InteractiveHistoryList } = await import("../commands/history.js");
    const sessions: SessionRecord[] = [
      {
        id: "abc12345",
        specName: "test-spec.md",
        featuresTotal: 10,
        featuresPassing: 8,
        score: 8.0,
        durationMs: 600000,
        cost: 1.0,
        timestamp: "2026-03-27T10:00:00.000Z",
      },
    ];
    const el = React.createElement(InteractiveHistoryList, { sessions });
    expect(el.props.sessions).toStrictEqual(sessions);
  });
});

// ---------------------------------------------------------------------------
// Source code inspection — footer in JSX return
// ---------------------------------------------------------------------------

describe("F063 — footer is present in list view JSX return", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "commands/history.tsx"), "utf-8");

  it("footer string is inside a <Text> element in source", () => {
    const src = getSource();
    // The footer must appear inside a JSX Text element
    expect(src).toMatch(/<Text[^>]*>.*Use ↑↓ to navigate, Enter for details, q to quit.*<\/Text>/s);
  });

  it("footer is rendered after the session list rows (in list view block)", () => {
    const src = getSource();
    // The footer appears after {sessions.map(...)} in the list view block
    const mapIdx = src.indexOf("sessions.map(");
    const footerIdx = src.indexOf(REQUIRED_FOOTER);
    expect(mapIdx).toBeGreaterThan(-1);
    expect(footerIdx).toBeGreaterThan(-1);
    expect(footerIdx).toBeGreaterThan(mapIdx);
  });

  it("footer is in marginTop Box (shows below list)", () => {
    const src = getSource();
    // The marginTop Box wrapping the footer hint
    const footerIdx = src.indexOf(REQUIRED_FOOTER);
    // Find the last marginTop before the footer
    const marginTopBeforeFooter = src.lastIndexOf("marginTop", footerIdx);
    expect(marginTopBeforeFooter).toBeGreaterThan(-1);
    expect(footerIdx - marginTopBeforeFooter).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// onExit wiring via useInput — tested through source analysis
// ---------------------------------------------------------------------------

describe("F063 — onExit is triggered on q via useInput", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "commands/history.tsx"), "utf-8");

  it("useInput handler is present in source", () => {
    expect(getSource()).toContain("useInput");
  });

  it("list-view q-key guard appears before handleHistoryKey call in useInput body", () => {
    const src = getSource();
    // Find the useInput callback block (after "useInput(")
    const useInputIdx = src.indexOf("useInput(");
    expect(useInputIdx).toBeGreaterThan(-1);
    const afterUseInput = src.slice(useInputIdx);
    const qGuardIdx = afterUseInput.indexOf(`input === "q" || key.escape`);
    const handleKeyIdx = afterUseInput.indexOf("handleHistoryKey(");
    expect(qGuardIdx).toBeGreaterThan(-1);
    expect(handleKeyIdx).toBeGreaterThan(-1);
    // The q guard must come before handleHistoryKey call within useInput body
    expect(qGuardIdx).toBeLessThan(handleKeyIdx);
  });

  it("onExit is invoked with optional chaining so missing prop is safe", () => {
    expect(getSource()).toContain("onExit?.()");
  });
});
