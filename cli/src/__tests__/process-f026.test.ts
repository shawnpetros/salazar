/**
 * F026 — Build Python harness CLI args from run options and config
 *
 * Tests for the buildHarnessArgs() function in lib/process.ts.
 */

import { describe, it, expect } from "vitest";
import type { HarnessConfig } from "../lib/types.js";
import { buildHarnessArgs } from "../lib/process.js";

// ---------------------------------------------------------------------------
// Test fixture
// ---------------------------------------------------------------------------

/** A minimal but fully-populated HarnessConfig for test use. */
const baseConfig: HarnessConfig = {
  models: {
    default: "claude-opus-4-5",
    planner: "claude-opus-4-5",
    generator: "claude-sonnet-4-5",
    evaluator: "claude-haiku-3-5",
  },
  dashboard: {
    url: "http://localhost:3000",
    secret: "test-secret",
  },
  output: {
    defaultDir: "/tmp/harness-output",
  },
  python: {
    path: "python3",
    venvPath: "",
  },
  history: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("F026 — buildHarnessArgs()", () => {
  it("returns an array starting with '-m', 'harness', and the specPath", () => {
    const args = buildHarnessArgs("spec.md", {}, baseConfig);
    expect(args[0]).toBe("-m");
    expect(args[1]).toBe("harness");
    expect(args[2]).toBe("spec.md");
  });

  it("uses config.models.default for --model when no model option is provided", () => {
    const args = buildHarnessArgs("spec.md", {}, baseConfig);
    const modelIdx = args.indexOf("--model");
    expect(modelIdx).toBeGreaterThan(-1);
    expect(args[modelIdx + 1]).toBe("claude-opus-4-5");
  });

  it("uses options.model to override --model when provided", () => {
    const args = buildHarnessArgs(
      "spec.md",
      { model: "claude-opus-4-6" },
      baseConfig
    );
    const modelIdx = args.indexOf("--model");
    expect(modelIdx).toBeGreaterThan(-1);
    expect(args[modelIdx + 1]).toBe("claude-opus-4-6");
  });

  it("uses config.models.evaluator for --model-evaluator when no modelEvaluator option is provided", () => {
    const args = buildHarnessArgs("spec.md", {}, baseConfig);
    const idx = args.indexOf("--model-evaluator");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("claude-haiku-3-5");
  });

  it("uses options.modelEvaluator to override --model-evaluator when provided", () => {
    const args = buildHarnessArgs(
      "spec.md",
      { modelEvaluator: "claude-sonnet-4-6" },
      baseConfig
    );
    const idx = args.indexOf("--model-evaluator");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("claude-sonnet-4-6");
  });

  it("uses config.dashboard.url for --dashboard-url when no dashboardUrl option is provided", () => {
    const args = buildHarnessArgs("spec.md", {}, baseConfig);
    const idx = args.indexOf("--dashboard-url");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("http://localhost:3000");
  });

  it("uses options.dashboardUrl to override --dashboard-url when provided", () => {
    const args = buildHarnessArgs(
      "spec.md",
      { dashboardUrl: "https://dash.example.com" },
      baseConfig
    );
    const idx = args.indexOf("--dashboard-url");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("https://dash.example.com");
  });

  it("does not include --multi flag when options.multi is false", () => {
    const args = buildHarnessArgs("spec.md", { multi: false }, baseConfig);
    expect(args).not.toContain("--multi");
  });

  it("does not include --multi flag when options.multi is absent", () => {
    const args = buildHarnessArgs("spec.md", {}, baseConfig);
    expect(args).not.toContain("--multi");
  });

  it("includes --multi flag when options.multi is true", () => {
    const args = buildHarnessArgs("spec.md", { multi: true }, baseConfig);
    expect(args).toContain("--multi");
  });

  it("includes all three value flags (--model, --model-evaluator, --dashboard-url) in every call", () => {
    const args = buildHarnessArgs("spec.md", {}, baseConfig);
    expect(args).toContain("--model");
    expect(args).toContain("--model-evaluator");
    expect(args).toContain("--dashboard-url");
  });

  it("merges all overrides at once when multiple options are provided", () => {
    const args = buildHarnessArgs(
      "my-spec.md",
      {
        model: "claude-opus-4-6",
        modelEvaluator: "claude-sonnet-4-6",
        dashboardUrl: "https://custom.example.com",
        multi: true,
      },
      baseConfig
    );

    const modelIdx = args.indexOf("--model");
    expect(args[modelIdx + 1]).toBe("claude-opus-4-6");

    const evalIdx = args.indexOf("--model-evaluator");
    expect(args[evalIdx + 1]).toBe("claude-sonnet-4-6");

    const dashIdx = args.indexOf("--dashboard-url");
    expect(args[dashIdx + 1]).toBe("https://custom.example.com");

    expect(args).toContain("--multi");
    expect(args[2]).toBe("my-spec.md");
  });

  it("works with a different specPath", () => {
    const args = buildHarnessArgs("path/to/feature-list.md", {}, baseConfig);
    expect(args[2]).toBe("path/to/feature-list.md");
  });

  it("returns a plain string array (no nested arrays)", () => {
    const args = buildHarnessArgs("spec.md", { multi: true }, baseConfig);
    for (const arg of args) {
      expect(typeof arg).toBe("string");
    }
  });
});
