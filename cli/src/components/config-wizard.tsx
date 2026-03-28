/**
 * ConfigWizard component — four-step onboarding wizard for harness configuration.
 *
 * Walks the user through:
 *  1. Generator model selection (ink-select-input)
 *  2. Evaluator model selection (ink-select-input)
 *  3. Dashboard URL entry (ink-text-input)
 *  4. Dashboard secret entry (masked ink-text-input)
 *
 * After all prompts are answered, `onSave` is called with the collected
 * configuration values.
 */

import React, { useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";

/** The subset of harness configuration collected by the wizard. */
export interface WizardConfig {
  /** Model identifier for the generator agent. */
  generatorModel: string;
  /** Model identifier for the evaluator agent. */
  evaluatorModel: string;
  /** Base URL of the dashboard server. */
  dashboardUrl: string;
  /** Shared secret for authenticating dashboard API requests. */
  dashboardSecret: string;
}

/** Props accepted by the {@link ConfigWizard} component. */
export interface ConfigWizardProps {
  /**
   * Callback invoked once all four prompts have been answered.
   * Receives the collected {@link WizardConfig} values.
   */
  onSave: (config: WizardConfig) => void;

  /**
   * Optional pre-populated initial values for the wizard.
   *
   * When provided, each step's input is pre-seeded with the corresponding
   * value from the current config rather than starting from an empty string.
   * This enables the interactive config editor (F057) to show the user their
   * existing settings.
   */
  initialValues?: Partial<WizardConfig>;
}

/** Available model choices shown in the select prompts. */
const MODEL_ITEMS = [
  { label: "claude-opus-4-5", value: "claude-opus-4-5" },
  { label: "claude-sonnet-4-5", value: "claude-sonnet-4-5" },
  { label: "claude-haiku-3-5", value: "claude-haiku-3-5" },
];

/** Wizard step indices. */
const STEP_GENERATOR_MODEL = 0;
const STEP_EVALUATOR_MODEL = 1;
const STEP_DASHBOARD_URL = 2;
const STEP_DASHBOARD_SECRET = 3;

/**
 * Config wizard for the harness CLI.
 *
 * Renders four sequential prompts: generator model (select), evaluator model
 * (select), dashboard URL (text), and dashboard secret (masked text). After all
 * prompts are answered, {@link ConfigWizardProps.onSave} is called with the
 * collected {@link WizardConfig} values.
 *
 * @param props - {@link ConfigWizardProps}
 * @returns A React element containing the wizard layout.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { ConfigWizard } from './components/config-wizard.js';
 *
 * render(<ConfigWizard onSave={(cfg) => console.log('Saved', cfg)} />);
 * ```
 */
export function ConfigWizard({ onSave, initialValues }: ConfigWizardProps): React.ReactElement {
  const [step, setStep] = useState<number>(STEP_GENERATOR_MODEL);
  const [generatorModel, setGeneratorModel] = useState<string>(initialValues?.generatorModel ?? "");
  const [evaluatorModel, setEvaluatorModel] = useState<string>(initialValues?.evaluatorModel ?? "");
  const [dashboardUrl, setDashboardUrl] = useState<string>(initialValues?.dashboardUrl ?? "");
  const [dashboardSecret, setDashboardSecret] = useState<string>(initialValues?.dashboardSecret ?? "");

  /** Handler for generator model selection. */
  const handleGeneratorSelect = (item: { label: string; value: string }): void => {
    setGeneratorModel(item.value);
    setStep(STEP_EVALUATOR_MODEL);
  };

  /** Handler for evaluator model selection. */
  const handleEvaluatorSelect = (item: { label: string; value: string }): void => {
    setEvaluatorModel(item.value);
    setStep(STEP_DASHBOARD_URL);
  };

  /** Handler for dashboard URL submission. */
  const handleUrlSubmit = (value: string): void => {
    setDashboardUrl(value);
    setStep(STEP_DASHBOARD_SECRET);
  };

  /** Handler for dashboard secret submission. */
  const handleSecretSubmit = (value: string): void => {
    setDashboardSecret(value);
    onSave({
      generatorModel,
      evaluatorModel,
      dashboardUrl,
      dashboardSecret: value,
    });
  };

  return (
    <Box flexDirection="column" paddingTop={1} paddingBottom={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{"Harness Configuration Wizard"}</Text>
      </Box>

      {step === STEP_GENERATOR_MODEL && (
        <Box flexDirection="column">
          <Text color="yellow">{"Step 1/4 — Generator model:"}</Text>
          <SelectInput
            items={MODEL_ITEMS}
            onSelect={handleGeneratorSelect}
          />
        </Box>
      )}

      {step === STEP_EVALUATOR_MODEL && (
        <Box flexDirection="column">
          <Text dimColor>{`Generator: ${generatorModel}`}</Text>
          <Text color="yellow">{"Step 2/4 — Evaluator model:"}</Text>
          <SelectInput
            items={MODEL_ITEMS}
            onSelect={handleEvaluatorSelect}
          />
        </Box>
      )}

      {step === STEP_DASHBOARD_URL && (
        <Box flexDirection="column">
          <Text dimColor>{`Generator: ${generatorModel}`}</Text>
          <Text dimColor>{`Evaluator: ${evaluatorModel}`}</Text>
          <Text color="yellow">{"Step 3/4 — Dashboard URL:"}</Text>
          <TextInput
            value={dashboardUrl}
            placeholder="http://localhost:3000"
            onChange={setDashboardUrl}
            onSubmit={handleUrlSubmit}
          />
        </Box>
      )}

      {step === STEP_DASHBOARD_SECRET && (
        <Box flexDirection="column">
          <Text dimColor>{`Generator: ${generatorModel}`}</Text>
          <Text dimColor>{`Evaluator: ${evaluatorModel}`}</Text>
          <Text dimColor>{`Dashboard URL: ${dashboardUrl}`}</Text>
          <Text color="yellow">{"Step 4/4 — Dashboard secret:"}</Text>
          <TextInput
            value={dashboardSecret}
            placeholder="your-secret-here"
            mask="*"
            onChange={setDashboardSecret}
            onSubmit={handleSecretSubmit}
          />
        </Box>
      )}
    </Box>
  );
}
