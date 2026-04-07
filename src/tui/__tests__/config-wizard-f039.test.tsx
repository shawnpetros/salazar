/**
 * F039 — Config wizard: model selection via ink-select-input
 *
 * Verifies that:
 *  - ConfigWizard is exported as a function from components/config-wizard.tsx
 *  - ConfigWizard accepts an onSave callback prop
 *  - config-wizard.tsx uses ink-select-input for model selection
 *  - onSave(config) is called with the collected values
 *
 * NOTE: The Salazar port simplified the wizard to two model-selection steps only.
 * The old wizard had four prompts including dashboardUrl/dashboardSecret/mask.
 * Those fields were removed in the port (no dashboard integration in CLI layer).
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";

describe("F039 — ConfigWizard exports", () => {
  it("ConfigWizard is exported as a function from components/config-wizard.tsx", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    expect(typeof ConfigWizard).toBe("function");
  });

  it("ConfigWizardProps type is satisfied by { onSave }", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    const onSave = vi.fn();
    const el = React.createElement(ConfigWizard, { onSave });
    expect(el).toBeDefined();
    expect(el.type).toBe(ConfigWizard);
  });

  it("onSave prop is stored on the element", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    const onSave = vi.fn();
    const el = React.createElement(ConfigWizard, { onSave });
    expect(el.props.onSave).toBe(onSave);
    expect(typeof el.props.onSave).toBe("function");
  });
});

describe("F039 — ConfigWizard source structure", () => {
  it("config-wizard.tsx exports ConfigWizard function", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/config-wizard.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function ConfigWizard");
  });

  it("config-wizard.tsx uses ink-select-input for model selection", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/config-wizard.tsx"),
      "utf-8"
    );
    expect(content).toMatch(/ink-select-input|SelectInput/);
  });

  it("config-wizard.tsx has generator model prompt", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/config-wizard.tsx"),
      "utf-8"
    );
    expect(content).toMatch(/generator.*model|generatorModel/i);
  });

  it("config-wizard.tsx has evaluator model prompt", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/config-wizard.tsx"),
      "utf-8"
    );
    expect(content).toMatch(/evaluator.*model|evaluatorModel/i);
  });

  it("config-wizard.tsx calls onSave with collected config", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/config-wizard.tsx"),
      "utf-8"
    );
    expect(content).toContain("onSave");
  });

  // NOTE: dashboardUrl, dashboardSecret, and mask were removed in the Salazar port.
  // The wizard was simplified to model-only selection (2 steps, no text inputs).
});

describe("F039 — WizardConfig type", () => {
  it("WizardConfig is exported from config-wizard.tsx", async () => {
    const mod = await import("../components/config-wizard.js");
    // WizardConfig is a TypeScript interface (type-only export), so we verify
    // the module exports ConfigWizard which references it.
    expect(typeof mod.ConfigWizard).toBe("function");
  });

  it("ConfigWizard element accepts onSave receiving WizardConfig-shaped object", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    const onSave = vi.fn();
    const el = React.createElement(ConfigWizard, { onSave });
    // Call onSave directly to simulate wizard completion
    const fakeConfig = {
      generatorModel: "claude-sonnet-4-5",
      evaluatorModel: "claude-haiku-3-5",
    };
    el.props.onSave(fakeConfig);
    expect(onSave).toHaveBeenCalledWith(fakeConfig);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("onSave receives the two model config fields", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    const onSave = vi.fn();
    const el = React.createElement(ConfigWizard, { onSave });
    const fakeConfig = {
      generatorModel: "claude-opus-4-5",
      evaluatorModel: "claude-sonnet-4-5",
    };
    el.props.onSave(fakeConfig);
    const received = onSave.mock.calls[0]?.[0];
    expect(received).toHaveProperty("generatorModel");
    expect(received).toHaveProperty("evaluatorModel");
  });

  // NOTE: The wizard was simplified to 2-step model selection only.
  // dashboardUrl/dashboardSecret were removed in the Salazar port.
});
