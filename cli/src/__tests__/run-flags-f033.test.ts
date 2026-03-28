/**
 * F033 — harness run flags: --model, --model-evaluator, --dashboard-url, --multi, --single
 *
 * Verifies that meow correctly parses the run command flags:
 *  - --model (string): model for the generator agent
 *  - --model-evaluator (string): model for the evaluator agent
 *  - --dashboard-url (string): URL of the harness dashboard
 *  - --multi (boolean): run multiple features in parallel
 *  - --single (boolean): run a single feature
 */

import { describe, it, expect } from "vitest";

describe("F033 — run flags", () => {
  it("parseCli: --model sets flags.model to the given string", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli(["run", "spec.md", "--model", "claude-opus-4-6"]);
    expect(cli.flags.model).toBe("claude-opus-4-6");
  });

  it("parseCli: --multi sets flags.multi to true and flags.single defaults to false", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli(["run", "spec.md", "--model", "claude-opus-4-6", "--multi"]);
    expect(cli.flags.model).toBe("claude-opus-4-6");
    expect(cli.flags.multi).toBe(true);
    expect(cli.flags.single).toBe(false);
  });

  it("parseCli: --single sets flags.single to true and flags.multi defaults to false", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli(["run", "spec.md", "--single"]);
    expect(cli.flags.single).toBe(true);
    expect(cli.flags.multi).toBe(false);
  });

  it("parseCli: --model-evaluator sets flags.modelEvaluator", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli(["run", "spec.md", "--model-evaluator", "claude-haiku"]);
    expect(cli.flags.modelEvaluator).toBe("claude-haiku");
  });

  it("parseCli: --dashboard-url sets flags.dashboardUrl", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli(["run", "spec.md", "--dashboard-url", "https://example.com"]);
    expect(cli.flags.dashboardUrl).toBe("https://example.com");
  });

  it("parseCli: flags.model is undefined when --model is not provided", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli(["run", "spec.md"]);
    expect(cli.flags.model).toBeUndefined();
  });

  it("parseCli: flags.multi and flags.single both default to false when neither is passed", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli(["run", "spec.md"]);
    expect(cli.flags.multi).toBe(false);
    expect(cli.flags.single).toBe(false);
  });

  it("parseCli: all flags can be combined", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([
      "run",
      "spec.md",
      "--model",
      "claude-opus-4-6",
      "--model-evaluator",
      "claude-haiku",
      "--dashboard-url",
      "https://example.com",
      "--multi",
    ]);
    expect(cli.flags.model).toBe("claude-opus-4-6");
    expect(cli.flags.modelEvaluator).toBe("claude-haiku");
    expect(cli.flags.dashboardUrl).toBe("https://example.com");
    expect(cli.flags.multi).toBe(true);
    expect(cli.flags.single).toBe(false);
  });
});
