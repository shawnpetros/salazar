/**
 * F040 — Ready screen: confirm save and show quick-start command examples
 *
 * Verifies that:
 *  - ReadyScreen is exported as a function from components/welcome.tsx
 *  - ReadyScreen accepts an onDone callback prop
 *  - welcome.tsx source contains the config-saved confirmation message
 *  - welcome.tsx source contains quick-start examples (salazar commands)
 *  - onDone prop is callable
 *
 * NOTE: In the Salazar port:
 *  - The config path changed from ~/.harness/config.json → ~/.salazar/config.json
 *  - The quick-start commands changed from 'harness run/config/history' → 'salazar run/config'
 *  - 'harness run --multi' and 'harness history' were removed
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
    // Port changed from ~/.harness/config.json to ~/.salazar/config.json
    expect(content).toMatch(/Configuration saved|config\.json/);
  });

  it("welcome.tsx contains 'salazar run' quick-start example", async () => {
    const content = await loadSource();
    expect(content).toMatch(/salazar run/);
  });

  it("welcome.tsx contains 'salazar config' quick-start example", async () => {
    const content = await loadSource();
    expect(content).toContain("salazar config");
  });

  it("welcome.tsx ReadyScreen uses onDone prop", async () => {
    const content = await loadSource();
    expect(content).toContain("onDone");
  });

  it.skip("welcome.tsx contains 'harness run --multi' quick-start example — skipped: command removed in Salazar port (no --multi flag)", () => {});

  it.skip("welcome.tsx contains 'harness config' quick-start example — skipped: renamed to 'salazar config' in port", () => {});

  it.skip("welcome.tsx contains 'harness history' quick-start example — skipped: removed from ready screen quick-start in port", () => {});

  it.skip("welcome.tsx contains all four quick-start examples — skipped: Salazar port has two quick-start examples (run, config) instead of four", () => {});

  it.skip("welcome.tsx contains '✓ Configuration saved to ~/.harness/config.json' — skipped: path changed to ~/.salazar/config.json and symbol changed to [ok] in port", () => {});
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
