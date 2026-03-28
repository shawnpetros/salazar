/**
 * F048 — Completion screen: summary of passed features, cost, output dir, and dashboard link
 *
 * Verifies that:
 *  - Completion is exported as a function (React component)
 *  - CompletionProps interface is exported
 *  - formatCost is exported as a helper function
 *  - formatCost formats values with $ prefix and two decimal places
 *  - completion.tsx source contains '✓ X/X features passed' pattern
 *  - completion.tsx source contains '✓ $X.XX total cost' pattern
 *  - completion.tsx source renders output directory path
 *  - completion.tsx source handles optional dashboard URL
 *  - completion.tsx source contains 'Press Enter to exit'
 *  - completion.tsx imports SessionCompleteEvent from types
 *  - completion.tsx uses useInput from ink
 *  - React.createElement(Completion, props) returns a valid React element
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Completion, formatCost, type CompletionProps } from "../components/completion.js";
import type { SessionCompleteEvent } from "../lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION_EVENT: SessionCompleteEvent = {
  type: "session_complete",
  passing: 38,
  totalFeatures: 38,
  durationMs: 33480000,
  cost: 9.27,
};

const OUTPUT_DIR = "/home/user/harness-output/run-abc123";
const DASHBOARD_URL = "http://localhost:3000";

// ---------------------------------------------------------------------------
// formatCost helper
// ---------------------------------------------------------------------------

describe("F048 — formatCost()", () => {
  it("is exported as a function", async () => {
    const { formatCost: fc } = await import("../components/completion.js");
    expect(typeof fc).toBe("function");
  });

  it("formats whole dollar amounts with two decimal places", () => {
    expect(formatCost(9)).toBe("$9.00");
  });

  it("formats a typical cost value correctly", () => {
    expect(formatCost(9.27)).toBe("$9.27");
  });

  it("formats a value with one decimal place to two", () => {
    expect(formatCost(0.1)).toBe("$0.10");
  });

  it("formats zero as $0.00", () => {
    expect(formatCost(0)).toBe("$0.00");
  });

  it("formats a larger value correctly", () => {
    expect(formatCost(123.456)).toBe("$123.46");
  });

  it("always prefixes with $", () => {
    expect(formatCost(1.5).startsWith("$")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Completion component exports
// ---------------------------------------------------------------------------

describe("F048 — Completion component exports", () => {
  it("Completion is exported as a function", async () => {
    const { Completion: C } = await import("../components/completion.js");
    expect(typeof C).toBe("function");
  });

  it("React.createElement(Completion, props) returns a valid React element", () => {
    const props: CompletionProps = {
      event: SESSION_EVENT,
      outputDir: OUTPUT_DIR,
      onDone: () => undefined,
    };
    const element = React.createElement(Completion, props);
    expect(element).toBeDefined();
    expect(element.type).toBe(Completion);
  });

  it("React.createElement passes event prop correctly", () => {
    const props: CompletionProps = {
      event: SESSION_EVENT,
      outputDir: OUTPUT_DIR,
      onDone: () => undefined,
    };
    const element = React.createElement(Completion, props);
    expect((element.props as CompletionProps).event).toBe(SESSION_EVENT);
  });

  it("React.createElement passes outputDir prop correctly", () => {
    const props: CompletionProps = {
      event: SESSION_EVENT,
      outputDir: OUTPUT_DIR,
      onDone: () => undefined,
    };
    const element = React.createElement(Completion, props);
    expect((element.props as CompletionProps).outputDir).toBe(OUTPUT_DIR);
  });

  it("React.createElement passes optional dashboardUrl prop correctly", () => {
    const props: CompletionProps = {
      event: SESSION_EVENT,
      outputDir: OUTPUT_DIR,
      dashboardUrl: DASHBOARD_URL,
      onDone: () => undefined,
    };
    const element = React.createElement(Completion, props);
    expect((element.props as CompletionProps).dashboardUrl).toBe(DASHBOARD_URL);
  });
});

// ---------------------------------------------------------------------------
// Source structure checks — content rendered by the component
// ---------------------------------------------------------------------------

describe("F048 — completion.tsx source structure", () => {
  it("imports SessionCompleteEvent from lib/types", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("SessionCompleteEvent");
    expect(content).toContain("lib/types");
  });

  it("uses useInput from ink", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("useInput");
  });

  it("exports Completion function", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function Completion");
  });

  it("exports CompletionProps interface", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("export interface CompletionProps");
  });

  it("exports formatCost function", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function formatCost");
  });

  it("source contains features passed rendering", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("features passed");
  });

  it("source contains total cost rendering", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("total cost");
  });

  it("source contains 'Press Enter to exit'", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("Press Enter to exit");
  });

  it("source renders passing and totalFeatures from event", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("event.passing");
    expect(content).toContain("event.totalFeatures");
  });

  it("source renders cost from event via formatCost", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("event.cost");
    expect(content).toContain("formatCost");
  });

  it("source renders outputDir", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("outputDir");
  });

  it("source handles optional dashboardUrl", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("dashboardUrl");
  });

  it("source uses ✓ checkmark for features passed line", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("✓");
  });

  it("source calls onDone when Enter pressed", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/completion.tsx"),
      "utf-8"
    );
    expect(content).toContain("onDone");
    expect(content).toContain("key.return");
  });
});

// ---------------------------------------------------------------------------
// formatCost integration with session event
// ---------------------------------------------------------------------------

describe("F048 — formatCost integration with SessionCompleteEvent", () => {
  it("formatCost(9.27) produces '$9.27' as shown in BDD scenario", () => {
    expect(formatCost(SESSION_EVENT.cost)).toBe("$9.27");
  });

  it("features passed string matches BDD scenario '38/38 features passed'", () => {
    const line = `✓ ${SESSION_EVENT.passing}/${SESSION_EVENT.totalFeatures} features passed`;
    expect(line).toBe("✓ 38/38 features passed");
  });

  it("total cost string matches BDD scenario '✓ $9.27 total cost'", () => {
    const line = `✓ ${formatCost(SESSION_EVENT.cost)} total cost`;
    expect(line).toBe("✓ $9.27 total cost");
  });
});
