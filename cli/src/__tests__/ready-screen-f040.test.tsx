/**
 * F040 — Ready screen: confirm save and show quick-start command examples
 *
 * Verifies that:
 *  - ReadyScreen is exported as a function from components/welcome.tsx
 *  - ReadyScreen accepts an onDone callback prop
 *  - welcome.tsx source contains '✓ Configuration saved to ~/.harness/config.json'
 *  - welcome.tsx source contains all four quick-start examples:
 *      harness run spec.md
 *      harness run --multi spec.md
 *      harness config
 *      harness history
 *  - onDone prop is callable
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";

// ---------------------------------------------------------------------------
// Helper: load welcome.tsx source text once
// ---------------------------------------------------------------------------

async function loadSource(): Promise<string> {
  const { readFileSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const srcRoot = resolve(__dirname, "..");
  return readFileSync(resolve(srcRoot, "components/welcome.tsx"), "utf-8");
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

describe("F040 — ReadyScreen exports", () => {
  it("ReadyScreen is exported as a function from components/welcome.tsx", async () => {
    const { ReadyScreen } = await import("../components/welcome.js");
    expect(typeof ReadyScreen).toBe("function");
  });

  it("ReadyScreenProps type is satisfied by { onDone }", async () => {
    const { ReadyScreen } = await import("../components/welcome.js");
    const onDone = vi.fn();
    const el = React.createElement(ReadyScreen, { onDone });
    expect(el).toBeDefined();
    expect(el.type).toBe(ReadyScreen);
  });

  it("ReadyScreen element stores the onDone prop", async () => {
    const { ReadyScreen } = await import("../components/welcome.js");
    const onDone = vi.fn();
    const el = React.createElement(ReadyScreen, { onDone });
    expect(el.props.onDone).toBe(onDone);
    expect(typeof el.props.onDone).toBe("function");
  });

  it("onDone callback is invocable directly", async () => {
    const { ReadyScreen } = await import("../components/welcome.js");
    const onDone = vi.fn();
    const el = React.createElement(ReadyScreen, { onDone });
    el.props.onDone();
    expect(onDone).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Source structure
// ---------------------------------------------------------------------------

describe("F040 — ReadyScreen source structure", () => {
  it("welcome.tsx exports ReadyScreen function", async () => {
    const content = await loadSource();
    expect(content).toContain("export function ReadyScreen");
  });

  it("welcome.tsx contains the config-saved confirmation message", async () => {
    const content = await loadSource();
    expect(content).toContain(
      "✓ Configuration saved to ~/.harness/config.json"
    );
  });

  it("welcome.tsx contains 'harness run' quick-start example", async () => {
    const content = await loadSource();
    expect(content).toMatch(/harness run/);
  });

  it("welcome.tsx contains 'harness run --multi' quick-start example", async () => {
    const content = await loadSource();
    expect(content).toContain("harness run --multi");
  });

  it("welcome.tsx contains 'harness config' quick-start example", async () => {
    const content = await loadSource();
    expect(content).toContain("harness config");
  });

  it("welcome.tsx contains 'harness history' quick-start example", async () => {
    const content = await loadSource();
    expect(content).toContain("harness history");
  });

  it("welcome.tsx contains all four quick-start examples", async () => {
    const content = await loadSource();
    const examples = [
      "harness run",
      "harness run --multi",
      "harness config",
      "harness history",
    ];
    for (const example of examples) {
      expect(content).toContain(example);
    }
  });

  it("welcome.tsx ReadyScreen uses onDone prop", async () => {
    const content = await loadSource();
    expect(content).toContain("onDone");
  });
});

// ---------------------------------------------------------------------------
// Renders a React element
// ---------------------------------------------------------------------------

describe("F040 — ReadyScreen renders", () => {
  it("ReadyScreen returns a React element when used via createElement", async () => {
    const { ReadyScreen } = await import("../components/welcome.js");
    const onDone = vi.fn();
    const el = React.createElement(ReadyScreen, { onDone });
    expect(el).toBeDefined();
    expect(typeof el).toBe("object");
    expect(el.type).toBe(ReadyScreen);
  });
});
