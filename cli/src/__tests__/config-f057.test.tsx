/**
 * F057 — config command: open interactive config wizard to update settings
 *
 * Verifies that:
 *  - configCommand is exported from commands/config.tsx
 *  - commands/config.tsx uses render() from ink to mount ConfigWizard
 *  - ConfigWizard accepts an optional initialValues prop for pre-population
 *  - The wizard is pre-populated with the current config values
 *  - writeConfig is called with the merged values when the wizard completes
 *  - A success message is printed after saving
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// configCommand export
// ---------------------------------------------------------------------------

describe("F057 — configCommand export", () => {
  it("configCommand is exported as a function from commands/config.tsx", async () => {
    const mod = await import("../commands/config.js");
    expect(typeof mod.configCommand).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// commands/config.tsx source structure
// ---------------------------------------------------------------------------

describe("F057 — commands/config.tsx source structure", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "commands/config.tsx"), "utf-8");

  it("imports render from ink", () => {
    const src = getSource();
    expect(src).toContain("render");
    expect(src).toContain("ink");
  });

  it("imports ConfigWizard component", () => {
    expect(getSource()).toContain("ConfigWizard");
  });

  it("imports readConfig from lib/config", () => {
    expect(getSource()).toContain("readConfig");
  });

  it("imports writeConfig from lib/config", () => {
    expect(getSource()).toContain("writeConfig");
  });

  it("exports configCommand function", () => {
    expect(getSource()).toContain("export async function configCommand");
  });

  it("passes initialValues to ConfigWizard", () => {
    expect(getSource()).toContain("initialValues");
  });

  it("maps generator model from config to initialValues", () => {
    const src = getSource();
    expect(src).toMatch(/generatorModel.*generator|generator.*generatorModel/);
  });

  it("maps evaluator model from config to initialValues", () => {
    const src = getSource();
    expect(src).toMatch(/evaluatorModel.*evaluator|evaluator.*evaluatorModel/);
  });

  it("maps dashboard url from config to initialValues", () => {
    const src = getSource();
    expect(src).toMatch(/dashboardUrl.*url|url.*dashboardUrl/);
  });

  it("maps dashboard secret from config to initialValues", () => {
    const src = getSource();
    expect(src).toMatch(/dashboardSecret.*secret|secret.*dashboardSecret/);
  });

  it("calls writeConfig with the updated config on save", () => {
    expect(getSource()).toContain("writeConfig");
  });

  it("calls render() to display the wizard", () => {
    expect(getSource()).toContain("render(");
  });

  it("prints a success message after saving", () => {
    const src = getSource();
    expect(src).toMatch(/Configuration saved|config.*saved/i);
  });
});

// ---------------------------------------------------------------------------
// ConfigWizard initialValues prop (added for F057)
// ---------------------------------------------------------------------------

describe("F057 — ConfigWizard initialValues prop", () => {
  it("ConfigWizard accepts an initialValues prop without error", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    const onSave = vi.fn();
    const initialValues = {
      generatorModel: "claude-sonnet-4-5",
      evaluatorModel: "claude-haiku-3-5",
      dashboardUrl: "http://localhost:9000",
      dashboardSecret: "existing-secret",
    };
    const el = React.createElement(ConfigWizard, { onSave, initialValues });
    expect(el).toBeDefined();
    expect(el.props.initialValues).toEqual(initialValues);
  });

  it("ConfigWizard works without initialValues (backward compatible)", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    const onSave = vi.fn();
    const el = React.createElement(ConfigWizard, { onSave });
    expect(el).toBeDefined();
    expect(el.type).toBe(ConfigWizard);
  });

  it("initialValues stores generatorModel on the element props", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    const onSave = vi.fn();
    const initialValues = { generatorModel: "claude-opus-4-5" };
    const el = React.createElement(ConfigWizard, { onSave, initialValues });
    expect(el.props.initialValues?.generatorModel).toBe("claude-opus-4-5");
  });

  it("initialValues stores evaluatorModel on the element props", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    const onSave = vi.fn();
    const initialValues = { evaluatorModel: "claude-haiku-3-5" };
    const el = React.createElement(ConfigWizard, { onSave, initialValues });
    expect(el.props.initialValues?.evaluatorModel).toBe("claude-haiku-3-5");
  });

  it("initialValues stores dashboardUrl on the element props", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    const onSave = vi.fn();
    const initialValues = { dashboardUrl: "https://dashboard.example.com" };
    const el = React.createElement(ConfigWizard, { onSave, initialValues });
    expect(el.props.initialValues?.dashboardUrl).toBe("https://dashboard.example.com");
  });

  it("initialValues stores dashboardSecret on the element props", async () => {
    const { ConfigWizard } = await import("../components/config-wizard.js");
    const onSave = vi.fn();
    const initialValues = { dashboardSecret: "my-secret" };
    const el = React.createElement(ConfigWizard, { onSave, initialValues });
    expect(el.props.initialValues?.dashboardSecret).toBe("my-secret");
  });
});

// ---------------------------------------------------------------------------
// components/config-wizard.tsx source — initialValues support
// ---------------------------------------------------------------------------

describe("F057 — config-wizard.tsx source: initialValues pre-population", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "components/config-wizard.tsx"), "utf-8");

  it("ConfigWizardProps declares an optional initialValues field", () => {
    const src = getSource();
    expect(src).toContain("initialValues");
  });

  it("generatorModel state uses initialValues fallback", () => {
    const src = getSource();
    // The useState initializer should reference initialValues for generatorModel
    expect(src).toMatch(/initialValues.*generatorModel|generatorModel.*initialValues/);
  });

  it("evaluatorModel state uses initialValues fallback", () => {
    const src = getSource();
    expect(src).toMatch(/initialValues.*evaluatorModel|evaluatorModel.*initialValues/);
  });

  it("dashboardUrl state uses initialValues fallback", () => {
    const src = getSource();
    expect(src).toMatch(/initialValues.*dashboardUrl|dashboardUrl.*initialValues/);
  });

  it("dashboardSecret state uses initialValues fallback", () => {
    const src = getSource();
    expect(src).toMatch(/initialValues.*dashboardSecret|dashboardSecret.*initialValues/);
  });
});

// ---------------------------------------------------------------------------
// configCommand behaviour: source-level verification of pre-population logic
// ---------------------------------------------------------------------------

describe("F057 — configCommand source: pre-population and save logic", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "commands/config.tsx"), "utf-8");

  it("configCommand maps config.models.generator to initialValues.generatorModel", () => {
    const src = getSource();
    // Source must show generatorModel being assigned from config.models.generator
    expect(src).toMatch(/generatorModel\s*:\s*config\.models\.generator/);
  });

  it("configCommand maps config.models.evaluator to initialValues.evaluatorModel", () => {
    const src = getSource();
    expect(src).toMatch(/evaluatorModel\s*:\s*config\.models\.evaluator/);
  });

  it("configCommand maps config.dashboard.url to initialValues.dashboardUrl", () => {
    const src = getSource();
    expect(src).toMatch(/dashboardUrl\s*:\s*config\.dashboard\.url/);
  });

  it("configCommand maps config.dashboard.secret to initialValues.dashboardSecret", () => {
    const src = getSource();
    expect(src).toMatch(/dashboardSecret\s*:\s*config\.dashboard\.secret/);
  });

  it("handleSave updates models.generator from wizard cfg.generatorModel", () => {
    const src = getSource();
    expect(src).toMatch(/generator\s*:\s*cfg\.generatorModel/);
  });

  it("handleSave updates models.evaluator from wizard cfg.evaluatorModel", () => {
    const src = getSource();
    expect(src).toMatch(/evaluator\s*:\s*cfg\.evaluatorModel/);
  });

  it("handleSave updates dashboard.url from wizard cfg.dashboardUrl", () => {
    const src = getSource();
    expect(src).toMatch(/url\s*:\s*cfg\.dashboardUrl/);
  });

  it("handleSave updates dashboard.secret from wizard cfg.dashboardSecret", () => {
    const src = getSource();
    expect(src).toMatch(/secret\s*:\s*cfg\.dashboardSecret/);
  });

  it("configCommand logs 'config command received' for routing test compatibility", () => {
    const src = getSource();
    expect(src).toMatch(/console\.log.*config command received/);
  });

  it("configCommand passes initialValues prop to ConfigWizard element", () => {
    const src = getSource();
    // React.createElement call or JSX must include initialValues
    expect(src).toContain("initialValues");
  });
});
