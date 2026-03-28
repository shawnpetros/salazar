/**
 * F050 — run command: merge CLI flags with config defaults to produce harness options
 *
 * Verifies that `buildHarnessOptions` correctly merges CLI flags with config
 * defaults:
 *  - When a flag is absent, the corresponding config value is used
 *  - When a flag is present, it overrides the config value
 */

import { describe, it, expect } from "vitest";
import { buildHarnessOptions } from "../commands/run.js";
import type { RunFlags, HarnessRunOptions } from "../commands/run.js";
import type { HarnessConfig } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** A minimal HarnessConfig used across tests. */
const makeConfig = (overrides?: Partial<HarnessConfig["models"]>): HarnessConfig => ({
  models: {
    default: "claude-sonnet-4-6",
    planner: "claude-opus-4-5",
    generator: "claude-sonnet-4-5",
    evaluator: "claude-haiku-3-5",
    ...overrides,
  },
  dashboard: { url: "http://localhost:3000", secret: "" },
  output: { defaultDir: "/tmp/harness" },
  python: { path: "python3", venvPath: "" },
  history: [],
});

// ---------------------------------------------------------------------------
// Tests: model flag
// ---------------------------------------------------------------------------

describe("F050 — buildHarnessOptions: model flag", () => {
  it("uses config.models.default when --model flag is not provided", () => {
    const config = makeConfig({ default: "claude-sonnet-4-6" });
    const options: HarnessRunOptions = buildHarnessOptions("spec.md", {}, config);
    expect(options.model).toBe("claude-sonnet-4-6");
  });

  it("uses the --model flag value when provided, overriding config", () => {
    const config = makeConfig({ default: "claude-sonnet-4-6" });
    const flags: RunFlags = { model: "claude-opus-4-6" };
    const options = buildHarnessOptions("spec.md", flags, config);
    expect(options.model).toBe("claude-opus-4-6");
  });

  it("reflects a different config default when no flag is given", () => {
    const config = makeConfig({ default: "claude-opus-4-5" });
    const options = buildHarnessOptions("spec.md", {}, config);
    expect(options.model).toBe("claude-opus-4-5");
  });
});

// ---------------------------------------------------------------------------
// Tests: modelEvaluator flag
// ---------------------------------------------------------------------------

describe("F050 — buildHarnessOptions: modelEvaluator flag", () => {
  it("uses config.models.evaluator when --model-evaluator flag is not provided", () => {
    const config = makeConfig({ evaluator: "claude-haiku-3-5" });
    const options = buildHarnessOptions("spec.md", {}, config);
    expect(options.modelEvaluator).toBe("claude-haiku-3-5");
  });

  it("uses the --model-evaluator flag value when provided", () => {
    const config = makeConfig({ evaluator: "claude-haiku-3-5" });
    const flags: RunFlags = { modelEvaluator: "claude-opus-4-6" };
    const options = buildHarnessOptions("spec.md", flags, config);
    expect(options.modelEvaluator).toBe("claude-opus-4-6");
  });
});

// ---------------------------------------------------------------------------
// Tests: dashboardUrl flag
// ---------------------------------------------------------------------------

describe("F050 — buildHarnessOptions: dashboardUrl flag", () => {
  it("uses config.dashboard.url when --dashboard-url flag is not provided", () => {
    const config = makeConfig();
    const options = buildHarnessOptions("spec.md", {}, config);
    expect(options.dashboardUrl).toBe("http://localhost:3000");
  });

  it("uses the --dashboard-url flag value when provided", () => {
    const flags: RunFlags = { dashboardUrl: "https://custom.example.com" };
    const options = buildHarnessOptions("spec.md", flags, makeConfig());
    expect(options.dashboardUrl).toBe("https://custom.example.com");
  });
});

// ---------------------------------------------------------------------------
// Tests: multi / single flags
// ---------------------------------------------------------------------------

describe("F050 — buildHarnessOptions: multi and single flags", () => {
  it("defaults multi to false when not provided", () => {
    const options = buildHarnessOptions("spec.md", {}, makeConfig());
    expect(options.multi).toBe(false);
  });

  it("sets multi to true when provided", () => {
    const options = buildHarnessOptions("spec.md", { multi: true }, makeConfig());
    expect(options.multi).toBe(true);
  });

  it("defaults single to false when not provided", () => {
    const options = buildHarnessOptions("spec.md", {}, makeConfig());
    expect(options.single).toBe(false);
  });

  it("sets single to true when provided", () => {
    const options = buildHarnessOptions("spec.md", { single: true }, makeConfig());
    expect(options.single).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: specPath passthrough
// ---------------------------------------------------------------------------

describe("F050 — buildHarnessOptions: specPath", () => {
  it("passes specPath through to the result unchanged", () => {
    const options = buildHarnessOptions("/some/path/spec.md", {}, makeConfig());
    expect(options.specPath).toBe("/some/path/spec.md");
  });
});

// ---------------------------------------------------------------------------
// Tests: all flags combined
// ---------------------------------------------------------------------------

describe("F050 — buildHarnessOptions: all flags combined", () => {
  it("all provided flags override their respective config defaults", () => {
    const config = makeConfig({
      default: "claude-sonnet-4-6",
      evaluator: "claude-haiku-3-5",
    });
    const flags: RunFlags = {
      model: "claude-opus-4-6",
      modelEvaluator: "claude-sonnet-4-5",
      dashboardUrl: "https://dash.example.com",
      multi: true,
      single: false,
    };
    const options = buildHarnessOptions("app_spec.md", flags, config);

    expect(options.specPath).toBe("app_spec.md");
    expect(options.model).toBe("claude-opus-4-6");
    expect(options.modelEvaluator).toBe("claude-sonnet-4-5");
    expect(options.dashboardUrl).toBe("https://dash.example.com");
    expect(options.multi).toBe(true);
    expect(options.single).toBe(false);
  });
});
