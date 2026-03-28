/**
 * F041 — Multi-step wizard state machine: advance through screens in order
 *
 * Verifies that:
 *  - OnboardingWizard is exported from app.tsx and returns a React element
 *  - WizardScreen type covers 'welcome' | 'prereqs' | 'config' | 'ready'
 *  - app.tsx imports Welcome, PrereqsCheck, ConfigWizard, and ReadyScreen
 *  - app.tsx contains WizardStateMachine (internal state machine component)
 *  - The wizard source shows state advancing from welcome → prereqs on continue
 *  - The wizard source shows state advancing from prereqs → config on done
 *  - The wizard source shows state advancing from config → ready on save
 *  - State only advances when a completion callback is invoked (source inspection)
 *  - OnboardingWizard wraps WizardStateMachine (no hooks at top level)
 *  - WizardScreen type is exported from app.tsx
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";

// ---------------------------------------------------------------------------
// Export shape tests
// ---------------------------------------------------------------------------

describe("F041 — OnboardingWizard export and shape", () => {
  it("OnboardingWizard is exported as a function from app.tsx", async () => {
    const { OnboardingWizard } = await import("../app.js");
    expect(typeof OnboardingWizard).toBe("function");
  });

  it("OnboardingWizard() returns a React element without throwing", async () => {
    // Must be callable directly (F035 compatibility) — no hooks at top level
    const { OnboardingWizard } = await import("../app.js");
    const el = OnboardingWizard();
    expect(el).toBeDefined();
    expect(typeof el).toBe("object");
  });

  it("React.createElement(OnboardingWizard) produces a valid element", async () => {
    const { OnboardingWizard } = await import("../app.js");
    const el = React.createElement(OnboardingWizard);
    expect(el).toBeDefined();
    expect(el.type).toBe(OnboardingWizard);
  });

  it("WizardScreen type is represented in the source", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain("WizardScreen");
  });
});

// ---------------------------------------------------------------------------
// Source structure: imports of screen components
// ---------------------------------------------------------------------------

describe("F041 — app.tsx imports all four screen components", () => {
  it("app.tsx imports Welcome from components/welcome", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain("Welcome");
    expect(content).toMatch(/components\/welcome/);
  });

  it("app.tsx imports PrereqsCheck from components/prereqs", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain("PrereqsCheck");
    expect(content).toMatch(/components\/prereqs/);
  });

  it("app.tsx imports ConfigWizard from components/config-wizard", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain("ConfigWizard");
    expect(content).toMatch(/components\/config-wizard/);
  });

  it("app.tsx imports ReadyScreen from components/welcome", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain("ReadyScreen");
  });
});

// ---------------------------------------------------------------------------
// Source structure: state machine transitions
// ---------------------------------------------------------------------------

describe("F041 — WizardStateMachine state transitions in source", () => {
  it("app.tsx contains WizardStateMachine function", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain("WizardStateMachine");
  });

  it("app.tsx uses useState to track the current wizard screen", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain("useState");
    expect(content).toMatch(/useState.*welcome|welcome.*useState/s);
  });

  it("app.tsx transitions welcome → prereqs via a continue handler", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    // Should set screen to 'prereqs' somewhere
    expect(content).toContain('"prereqs"');
    // Should have a handler that changes state to prereqs
    expect(content).toMatch(/setScreen.*prereqs|prereqs.*setScreen/s);
  });

  it("app.tsx transitions prereqs → config via a done handler", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain('"config"');
    expect(content).toMatch(/setScreen.*config|config.*setScreen/s);
  });

  it("app.tsx transitions config → ready via a save handler", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain('"ready"');
    expect(content).toMatch(/setScreen.*ready|ready.*setScreen/s);
  });

  it("app.tsx renders Welcome for the welcome screen", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toMatch(/<Welcome\s/);
  });

  it("app.tsx renders PrereqsCheck for the prereqs screen", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toMatch(/<PrereqsCheck\s/);
  });

  it("app.tsx renders ConfigWizard for the config screen", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toMatch(/<ConfigWizard\s/);
  });

  it("app.tsx renders ReadyScreen for the ready screen", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toMatch(/<ReadyScreen\s/);
  });

  it("OnboardingWizard renders WizardStateMachine (no hooks at top level)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    // OnboardingWizard should render WizardStateMachine
    expect(content).toMatch(/<WizardStateMachine\s*\/>/);
  });
});

// ---------------------------------------------------------------------------
// Callback-driven advancement (structural verification)
// ---------------------------------------------------------------------------

describe("F041 — state advances only via completion callbacks", () => {
  it("app.tsx passes onContinue callback to Welcome", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toMatch(/Welcome.*onContinue|onContinue.*Welcome/s);
  });

  it("app.tsx passes onDone callback to PrereqsCheck", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toMatch(/PrereqsCheck.*onDone|onDone.*PrereqsCheck/s);
  });

  it("app.tsx passes onSave callback to ConfigWizard", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toMatch(/ConfigWizard.*onSave|onSave.*ConfigWizard/s);
  });

  it("app.tsx passes onDone callback to ReadyScreen", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toMatch(/ReadyScreen.*onDone|onDone.*ReadyScreen/s);
  });

  it("app.tsx uses switch or conditional to render different screens by state", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    // Should have a switch or if/else to select the correct screen component
    expect(content).toMatch(/switch\s*\(screen\)|case.*welcome|screen.*===.*welcome/s);
  });
});

// ---------------------------------------------------------------------------
// F035 regression guard — App still renders OnboardingWizard
// ---------------------------------------------------------------------------

describe("F041 — F035 regression: App still routes to OnboardingWizard", () => {
  it("App renders OnboardingWizard for first-run (no command)", async () => {
    const { App, OnboardingWizard } = await import("../app.js");
    const el = App({ firstRun: true });
    expect(el.type).toBe(OnboardingWizard);
  });

  it("App renders OnboardingWizard when no command given (not first-run)", async () => {
    const { App, OnboardingWizard } = await import("../app.js");
    const el = App({ firstRun: false });
    expect(el.type).toBe(OnboardingWizard);
  });

  it("OnboardingWizard element returned by App has no hooks at call-site", async () => {
    const { App } = await import("../app.js");
    // This must not throw (no hooks in OnboardingWizard itself)
    expect(() => App({ firstRun: true })).not.toThrow();
  });

  it("OnboardingWizard() can be called directly without throwing", async () => {
    const { OnboardingWizard } = await import("../app.js");
    expect(() => OnboardingWizard()).not.toThrow();
    const result = OnboardingWizard();
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });
});

// ---------------------------------------------------------------------------
// Smoke: sub-components are importable and are functions
// ---------------------------------------------------------------------------

describe("F041 — screen component imports resolve correctly", () => {
  it("Welcome is importable from components/welcome.tsx", async () => {
    const { Welcome } = await import("../components/welcome.js");
    expect(typeof Welcome).toBe("function");
  });

  it("PrereqsCheck is importable from components/prereqs.tsx", async () => {
    const { PrereqsCheck } = await import("../components/prereqs.js");
    expect(typeof PrereqsCheck).toBe("function");
  });

  it("ConfigWizard is importable from components/config-wizard.tsx", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    expect(typeof ConfigWizard).toBe("function");
  });

  it("ReadyScreen is importable from components/welcome.tsx", async () => {
    const { ReadyScreen } = await import("../components/welcome.js");
    expect(typeof ReadyScreen).toBe("function");
  });
});

// Suppress unused import lint warning
void vi;
