/**
 * config command handler.
 *
 * Invoked when the user runs `salazar config`.
 * Opens the interactive configuration wizard pre-populated with the
 * user's current settings, and persists changes on completion.
 */

import React from "react";
import { render } from "ink";
import { loadConfig, saveConfig } from "../../lib/config.js";
import { ConfigWizard, type WizardConfig } from "../components/config-wizard.js";

/**
 * Execute the `config` command.
 *
 * Reads the existing configuration from disk, maps the relevant fields to a
 * {@link WizardConfig} for pre-population, and renders the {@link ConfigWizard}
 * component via Ink. When the wizard completes, the user's choices are merged
 * back into the full config and persisted.
 */
export async function configCommand(): Promise<void> {
  const config = loadConfig();

  const initialValues: WizardConfig = {
    generatorModel: config.models.generator,
    evaluatorModel: config.models.evaluator,
  };

  console.log("[salazar] config command received");

  const handleSave = (cfg: WizardConfig): void => {
    const updatedConfig = {
      ...config,
      models: {
        ...config.models,
        generator: cfg.generatorModel,
        evaluator: cfg.evaluatorModel,
      },
    };
    saveConfig(updatedConfig);
    console.log("[ok] Configuration saved to ~/.salazar/config.json");
    process.exit(0);
  };

  render(
    React.createElement(ConfigWizard, { onSave: handleSave, initialValues }),
    { patchConsole: false },
  );
}
