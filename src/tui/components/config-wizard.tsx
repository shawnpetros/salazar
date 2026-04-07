/**
 * ConfigWizard component -- two-step model configuration wizard.
 *
 * Walks the user through:
 *  1. Generator model selection (ink-select-input)
 *  2. Evaluator model selection (ink-select-input)
 *
 * After both prompts are answered, `onSave` is called with the collected
 * configuration values.
 */

import React, { useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

/** The subset of configuration collected by the wizard. */
export interface WizardConfig {
  /** Model identifier for the generator agent. */
  generatorModel: string;
  /** Model identifier for the evaluator agent. */
  evaluatorModel: string;
}

/** Props accepted by the {@link ConfigWizard} component. */
export interface ConfigWizardProps {
  /**
   * Callback invoked once all prompts have been answered.
   * Receives the collected {@link WizardConfig} values.
   */
  onSave: (config: WizardConfig) => void;

  /**
   * Optional pre-populated initial values for the wizard.
   */
  initialValues?: Partial<WizardConfig>;
}

/** Available model choices shown in the select prompts. */
const MODEL_ITEMS = [
  { label: "claude-sonnet-4-6", value: "claude-sonnet-4-6" },
  { label: "claude-opus-4-6", value: "claude-opus-4-6" },
  { label: "claude-haiku-4-5", value: "claude-haiku-4-5" },
];

/** Wizard step indices. */
const STEP_GENERATOR_MODEL = 0;
const STEP_EVALUATOR_MODEL = 1;

/**
 * Config wizard for the Salazar CLI.
 *
 * Renders two sequential prompts: generator model (select) and evaluator model
 * (select). After both prompts are answered, {@link ConfigWizardProps.onSave}
 * is called with the collected {@link WizardConfig} values.
 */
export function ConfigWizard({ onSave, initialValues }: ConfigWizardProps): React.ReactElement {
  const [step, setStep] = useState<number>(STEP_GENERATOR_MODEL);
  const [generatorModel, setGeneratorModel] = useState<string>(initialValues?.generatorModel ?? "");

  /** Handler for generator model selection. */
  const handleGeneratorSelect = (item: { label: string; value: string }): void => {
    setGeneratorModel(item.value);
    setStep(STEP_EVALUATOR_MODEL);
  };

  /** Handler for evaluator model selection. */
  const handleEvaluatorSelect = (item: { label: string; value: string }): void => {
    onSave({
      generatorModel,
      evaluatorModel: item.value,
    });
  };

  return (
    <Box flexDirection="column" paddingTop={1} paddingBottom={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{"Salazar Configuration"}</Text>
      </Box>

      {step === STEP_GENERATOR_MODEL && (
        <Box flexDirection="column">
          <Text color="yellow">{"Step 1/2 -- Generator model:"}</Text>
          <SelectInput
            items={MODEL_ITEMS}
            onSelect={handleGeneratorSelect}
          />
        </Box>
      )}

      {step === STEP_EVALUATOR_MODEL && (
        <Box flexDirection="column">
          <Text dimColor>{`Generator: ${generatorModel}`}</Text>
          <Text color="yellow">{"Step 2/2 -- Evaluator model:"}</Text>
          <SelectInput
            items={MODEL_ITEMS}
            onSelect={handleEvaluatorSelect}
          />
        </Box>
      )}
    </Box>
  );
}
