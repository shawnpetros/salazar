/**
 * F035 — Root app.tsx: route to onboarding wizard on first run vs normal command
 *
 * Verifies that:
 *  - selectView() returns 'onboarding' when no command and firstRun is true
 *  - selectView() returns 'onboarding' when no command and firstRun is false
 *  - selectView() returns 'run' when command is 'run'
 *  - selectView() returns 'config' when command is 'config'
 *  - selectView() returns 'history' when command is 'history'
 *  - selectView() returns 'onboarding' for any unknown command
 *  - selectView() routes to the named command even when firstRun is true
 *  - App is exported as a function (React component)
 *  - App renders OnboardingWizard (via selectView) when firstRun=true and no command
 *  - App renders RunView when command='run'
 *  - App renders ConfigView when command='config'
 *  - App renders HistoryView when command='history'
 */

import { describe, it, expect } from "vitest";
import React from "react";
import {
  selectView,
  App,
  OnboardingWizard,
  RunView,
  ConfigView,
  HistoryView,
  type AppView,
} from "../app.js";

// ---------------------------------------------------------------------------
// selectView() pure routing logic
// ---------------------------------------------------------------------------

describe("F035 — selectView() routing", () => {
  it("returns 'onboarding' when command is undefined and firstRun is true", () => {
    expect(selectView(undefined, true)).toBe("onboarding");
  });

  it("returns 'onboarding' when command is undefined and firstRun is false", () => {
    expect(selectView(undefined, false)).toBe("onboarding");
  });

  it("returns 'run' when command is 'run' and firstRun is false", () => {
    expect(selectView("run", false)).toBe("run");
  });

  it("returns 'run' when command is 'run' even when firstRun is true", () => {
    expect(selectView("run", true)).toBe("run");
  });

  it("returns 'config' when command is 'config' and firstRun is false", () => {
    expect(selectView("config", false)).toBe("config");
  });

  it("returns 'config' when command is 'config' even when firstRun is true", () => {
    expect(selectView("config", true)).toBe("config");
  });

  it("returns 'history' when command is 'history' and firstRun is false", () => {
    expect(selectView("history", false)).toBe("history");
  });

  it("returns 'history' when command is 'history' even when firstRun is true", () => {
    expect(selectView("history", true)).toBe("history");
  });

  it("returns 'onboarding' for an unrecognised command string", () => {
    expect(selectView("unknown-cmd", false)).toBe("onboarding");
  });

  it("returns 'onboarding' for an empty string command", () => {
    expect(selectView("", false)).toBe("onboarding");
  });

  it("selectView return value is one of the valid AppView literals", () => {
    const validViews: AppView[] = ["onboarding", "run", "config", "history"];
    const views = [
      selectView(undefined, true),
      selectView(undefined, false),
      selectView("run", false),
      selectView("config", false),
      selectView("history", false),
    ];
    for (const v of views) {
      expect(validViews).toContain(v);
    }
  });
});

// ---------------------------------------------------------------------------
// App component exports & shape
// ---------------------------------------------------------------------------

describe("F035 — App component exports", () => {
  it("App is exported as a function", async () => {
    const { App: AppComp } = await import("../app.js");
    expect(typeof AppComp).toBe("function");
  });

  it("selectView is exported as a function", async () => {
    const { selectView: sv } = await import("../app.js");
    expect(typeof sv).toBe("function");
  });

  it("OnboardingWizard is exported as a function", async () => {
    const { OnboardingWizard: OW } = await import("../app.js");
    expect(typeof OW).toBe("function");
  });

  it("RunView is exported as a function", async () => {
    const { RunView: RV } = await import("../app.js");
    expect(typeof RV).toBe("function");
  });

  it("ConfigView is exported as a function", async () => {
    const { ConfigView: CV } = await import("../app.js");
    expect(typeof CV).toBe("function");
  });

  it("HistoryView is exported as a function", async () => {
    const { HistoryView: HV } = await import("../app.js");
    expect(typeof HV).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// App component renders the correct React element type
// ---------------------------------------------------------------------------

describe("F035 — App renders correct component based on routing", () => {
  it("App renders OnboardingWizard when firstRun=true and no command", () => {
    const element = App({ firstRun: true });
    // The element should be of type OnboardingWizard
    expect(element.type).toBe(OnboardingWizard);
  });

  it("App renders OnboardingWizard when firstRun=false and no command", () => {
    const element = App({ firstRun: false });
    expect(element.type).toBe(OnboardingWizard);
  });

  it("App renders RunView when command='run'", () => {
    const element = App({ command: "run", specPath: "spec.md", firstRun: false });
    expect(element.type).toBe(RunView);
  });

  it("App passes specPath to RunView", () => {
    const element = App({ command: "run", specPath: "my-spec.md", firstRun: false });
    expect(element.type).toBe(RunView);
    expect((element.props as { specPath?: string }).specPath).toBe("my-spec.md");
  });

  it("App renders ConfigView when command='config'", () => {
    const element = App({ command: "config", firstRun: false });
    expect(element.type).toBe(ConfigView);
  });

  it("App renders HistoryView when command='history'", () => {
    const element = App({ command: "history", firstRun: false });
    expect(element.type).toBe(HistoryView);
  });

  it("App renders OnboardingWizard for an unknown command", () => {
    const element = App({ command: "foobar", firstRun: false });
    expect(element.type).toBe(OnboardingWizard);
  });

  it("App renders RunView even when firstRun=true if command='run'", () => {
    const element = App({ command: "run", specPath: "spec.md", firstRun: true });
    expect(element.type).toBe(RunView);
  });

  it("App renders ConfigView even when firstRun=true if command='config'", () => {
    const element = App({ command: "config", firstRun: true });
    expect(element.type).toBe(ConfigView);
  });

  it("App renders HistoryView even when firstRun=true if command='history'", () => {
    const element = App({ command: "history", firstRun: true });
    expect(element.type).toBe(HistoryView);
  });
});

// ---------------------------------------------------------------------------
// Sub-component smoke tests (returns a valid React element)
// ---------------------------------------------------------------------------

describe("F035 — sub-component smoke tests", () => {
  it("OnboardingWizard returns a React element", () => {
    const el = React.createElement(OnboardingWizard);
    // React.createElement itself is synchronous — calling the function gives us the element
    const rendered = OnboardingWizard();
    expect(rendered).toBeDefined();
    expect(typeof rendered).toBe("object");
    // Avoid void
    void el;
  });

  it("RunView returns a React element", () => {
    const rendered = RunView({ specPath: "test.md" });
    expect(rendered).toBeDefined();
  });

  it("ConfigView returns a React element", () => {
    const rendered = ConfigView();
    expect(rendered).toBeDefined();
  });

  it("HistoryView returns a React element", () => {
    const rendered = HistoryView();
    expect(rendered).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Source structure checks
// ---------------------------------------------------------------------------

describe("F035 — app.tsx source structure", () => {
  it("app.tsx imports isFirstRun from lib/config", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain("isFirstRun");
    expect(content).toContain("lib/config");
  });

  it("app.tsx exports the App function", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain("export function App");
  });

  it("app.tsx exports the selectView function", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(resolve(srcRoot, "app.tsx"), "utf-8");
    expect(content).toContain("export function selectView");
  });
});
