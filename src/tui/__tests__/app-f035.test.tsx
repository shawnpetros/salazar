/**
 * F035 — App root component
 *
 * Tests for the App root component are covered in wizard-f041.test.tsx
 * under the "F041 — F035 regression: App still routes to OnboardingWizard" suite.
 */

import { describe, it, expect } from "vitest";
import { App, OnboardingWizard, selectView } from "../app.js";

describe("F035 — App root component", () => {
  it("App is exported as a function from app.tsx", () => {
    expect(typeof App).toBe("function");
  });

  it("OnboardingWizard is exported as a function from app.tsx", () => {
    expect(typeof OnboardingWizard).toBe("function");
  });

  it("selectView returns 'onboarding' for undefined command", () => {
    expect(selectView(undefined, false)).toBe("onboarding");
  });

  it("selectView returns 'run' for 'run' command", () => {
    expect(selectView("run", false)).toBe("run");
  });

  it("selectView returns 'config' for 'config' command", () => {
    expect(selectView("config", false)).toBe("config");
  });

  it("selectView returns 'history' for 'history' command", () => {
    expect(selectView("history", false)).toBe("history");
  });
});
