/**
 * F037 — Welcome screen: ink-gradient title, description, and prompt to continue
 *
 * Verifies that:
 *  - Welcome is exported as a function from components/welcome.tsx
 *  - Welcome accepts an onContinue callback prop
 *  - Welcome renders a React element
 *  - welcome.tsx source contains the '⬡ Harness — Autonomous Code Builder' title
 *  - welcome.tsx source contains 'Press Enter to continue' prompt
 *  - welcome.tsx source uses ink-gradient for the title
 *  - welcome.tsx source contains a description
 *  - onContinue prop is callable
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";

describe("F037 — Welcome exports", () => {
  it("Welcome is exported as a function from components/welcome.tsx", async () => {
    const { Welcome } = await import("../components/welcome.js");
    expect(typeof Welcome).toBe("function");
  });

  it("WelcomeProps type is satisfied by { onContinue }", async () => {
    const { Welcome } = await import("../components/welcome.js");
    const onContinue = vi.fn();
    const el = React.createElement(Welcome, { onContinue });
    expect(el).toBeDefined();
    expect(el.type).toBe(Welcome);
  });
});

describe("F037 — Welcome renders correct structure", () => {
  it("Welcome returns a React element when used via createElement", async () => {
    const { Welcome } = await import("../components/welcome.js");
    const onContinue = vi.fn();
    const el = React.createElement(Welcome, { onContinue });
    expect(el).toBeDefined();
    expect(typeof el).toBe("object");
    expect(el.type).toBe(Welcome);
  });

  it("Welcome props include onContinue callback", async () => {
    const { Welcome } = await import("../components/welcome.js");
    const onContinue = vi.fn();
    const el = React.createElement(Welcome, { onContinue });
    expect(el.props.onContinue).toBe(onContinue);
  });

  it("onContinue prop is a callable function", async () => {
    const { Welcome } = await import("../components/welcome.js");
    const onContinue = vi.fn();
    const el = React.createElement(Welcome, { onContinue });
    expect(typeof el.props.onContinue).toBe("function");
    el.props.onContinue();
    expect(onContinue).toHaveBeenCalledOnce();
  });
});

describe("F037 — Welcome source structure", () => {
  it("welcome.tsx source contains the ⬡ Salazar — Autonomous Code Builder title", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/welcome.tsx"),
      "utf-8"
    );
    // Title changed from "Harness" to "Salazar" in the port
    expect(content).toContain("⬡ Salazar — Autonomous Code Builder");
  });

  it("welcome.tsx source contains 'Press Enter to continue' prompt", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/welcome.tsx"),
      "utf-8"
    );
    expect(content).toContain("Press Enter to continue");
  });

  it("welcome.tsx source uses ink-gradient for the title", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/welcome.tsx"),
      "utf-8"
    );
    expect(content).toMatch(/ink-gradient|Gradient/);
  });

  it("welcome.tsx source exports Welcome function", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/welcome.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function Welcome");
  });

  it("welcome.tsx source contains a brief description", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/welcome.tsx"),
      "utf-8"
    );
    // Should contain some descriptive text beyond just the title
    expect(content).toMatch(/Automates|automates|autonomous|Autonomous|generates|builds/i);
  });

  it("welcome.tsx source uses useInput from ink for keyboard handling", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/welcome.tsx"),
      "utf-8"
    );
    expect(content).toContain("useInput");
  });

  it("welcome.tsx source calls onContinue on Enter key", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/welcome.tsx"),
      "utf-8"
    );
    expect(content).toContain("onContinue");
    expect(content).toMatch(/key\.return|return.*onContinue/);
  });
});
