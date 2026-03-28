/**
 * config command handler.
 *
 * Invoked when the user runs `harness config` with no subcommand.
 * Opens the interactive configuration wizard pre-populated with the
 * user's current settings, and persists changes on completion.
 */

import React from "react";
import { render } from "ink";
import { readConfig, writeConfig, setConfigKey } from "../lib/config.js";
import { ConfigWizard, type WizardConfig } from "../components/config-wizard.js";

/**
 * Execute the `config` command.
 *
 * Reads the existing harness configuration from disk, maps the relevant
 * fields to a {@link WizardConfig} for pre-population, and renders the
 * {@link ConfigWizard} component via Ink.  When the wizard completes,
 * the user's choices are merged back into the full config and persisted
 * to `~/.harness/config.json`.
 *
 * @example
 * ```ts
 * // Called by the CLI router when `harness config` is executed:
 * await configCommand();
 * ```
 */
export async function configCommand(): Promise<void> {
  const config = readConfig();

  // Map the current config into the WizardConfig shape for pre-population.
  const initialValues: WizardConfig = {
    generatorModel: config.models.generator,
    evaluatorModel: config.models.evaluator,
    dashboardUrl: config.dashboard.url,
    dashboardSecret: config.dashboard.secret,
  };

  // Emit a routing confirmation log (used by the command routing tests).
  console.log("config command received");

  /**
   * Callback invoked by the wizard once all prompts have been answered.
   * Merges the wizard values back into the full config and writes to disk.
   */
  const handleSave = (cfg: WizardConfig): void => {
    const updatedConfig = {
      ...config,
      models: {
        ...config.models,
        generator: cfg.generatorModel,
        evaluator: cfg.evaluatorModel,
      },
      dashboard: {
        url: cfg.dashboardUrl,
        secret: cfg.dashboardSecret,
      },
    };
    writeConfig(updatedConfig);
    console.log("✓ Configuration saved to ~/.harness/config.json");
    process.exit(0);
  };

  // Render the wizard. patchConsole: false keeps test spies intact.
  render(
    React.createElement(ConfigWizard, { onSave: handleSave, initialValues }),
    { patchConsole: false }
  );
}

/**
 * Execute the `config set model <modelName>` subcommand.
 *
 * Updates `models.default` in `~/.harness/config.json` to the given model
 * name and prints a success message to stdout.
 *
 * @param modelName - The model identifier to set as the default (e.g. `'claude-opus-4-6'`).
 * @param configPath - Override the config file path. Defaults to `~/.harness/config.json`.
 *   Useful for testing.
 *
 * @example
 * ```ts
 * // Called by the CLI router when `harness config set model claude-opus-4-6` is executed:
 * await configSetModelCommand('claude-opus-4-6');
 * ```
 */
export function configSetModelCommand(
  modelName: string,
  configPath?: string
): void {
  if (configPath !== undefined) {
    setConfigKey("models.default", modelName, configPath);
  } else {
    setConfigKey("models.default", modelName);
  }
  console.log(`✓ Default model updated to '${modelName}'`);
}

/**
 * Execute the `config set dashboard-url <url>` subcommand.
 *
 * Updates `dashboard.url` in `~/.harness/config.json` to the given URL
 * and prints a success message to stdout.
 *
 * @param url - The dashboard URL to set (e.g. `'https://dash.example.com'`).
 * @param configPath - Override the config file path. Defaults to `~/.harness/config.json`.
 *   Useful for testing.
 *
 * @example
 * ```ts
 * // Called by the CLI router when `harness config set dashboard-url https://dash.example.com` is executed:
 * configSetDashboardUrlCommand('https://dash.example.com');
 * ```
 */
export function configSetDashboardUrlCommand(
  url: string,
  configPath?: string
): void {
  if (configPath !== undefined) {
    setConfigKey("dashboard.url", url, configPath);
  } else {
    setConfigKey("dashboard.url", url);
  }
  console.log(`✓ Dashboard URL updated to '${url}'`);
}

/**
 * Execute the `config set dashboard-secret <secret>` subcommand.
 *
 * Updates `dashboard.secret` in `~/.harness/config.json` to the given secret
 * and prints a success message to stdout.
 *
 * @param secret - The dashboard secret to set (e.g. `'abc123'`).
 * @param configPath - Override the config file path. Defaults to `~/.harness/config.json`.
 *   Useful for testing.
 *
 * @example
 * ```ts
 * // Called by the CLI router when `harness config set dashboard-secret abc123` is executed:
 * configSetDashboardSecretCommand('abc123');
 * ```
 */
export function configSetDashboardSecretCommand(
  secret: string,
  configPath?: string
): void {
  if (configPath !== undefined) {
    setConfigKey("dashboard.secret", secret, configPath);
  } else {
    setConfigKey("dashboard.secret", secret);
  }
  console.log(`✓ Dashboard secret updated`);
}
