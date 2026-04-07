/**
 * app.tsx -- Root Ink component for the Salazar CLI.
 *
 * Routes to the onboarding wizard on first run (when no config exists and no
 * subcommand was given), or to the appropriate command component when a
 * subcommand is provided.
 *
 * Onboarding state machine:
 *   welcome -> prereqs -> config -> ready -> (exit)
 *
 * Command routing:
 *   "run"     -> RunDashboard
 *   "config"  -> ConfigWizard
 *   "history" -> InteractiveHistoryList
 */

import React, { useState } from "react";
import { Text } from "ink";
import { existsSync } from "node:fs";
import { loadConfig, saveConfig } from "../lib/config.js";
import { getConfigPath } from "../lib/paths.js";
import type { SalazarConfig } from "../lib/types.js";
import { Welcome, ReadyScreen } from "./components/welcome.js";
import { PrereqsCheck } from "./components/prereqs.js";
import { ConfigWizard, type WizardConfig } from "./components/config-wizard.js";
import { RunDashboard } from "./components/run-dashboard.js";
import { InteractiveHistoryList, loadSessions } from "./commands/history.js";

// ---------------------------------------------------------------------------
// First-run detection
// ---------------------------------------------------------------------------

function isFirstRun(): boolean {
  return !existsSync(getConfigPath());
}

// ---------------------------------------------------------------------------
// Wizard state machine types
// ---------------------------------------------------------------------------

export type WizardScreen = "welcome" | "prereqs" | "config" | "ready" | "halted";

// ---------------------------------------------------------------------------
// Internal wizard state machine component
// ---------------------------------------------------------------------------

function WizardStateMachine(): React.ReactElement {
  const [screen, setScreen] = useState<WizardScreen>("welcome");

  const handleWelcomeContinue = (): void => {
    setScreen("prereqs");
  };

  const handlePrereqsDone = (allPassed: boolean): void => {
    if (allPassed) {
      setScreen("config");
    } else {
      setScreen("halted");
    }
  };

  const handleConfigSave = (cfg: WizardConfig): void => {
    const config = loadConfig();
    const updatedConfig: SalazarConfig = {
      ...config,
      models: {
        ...config.models,
        generator: cfg.generatorModel,
        evaluator: cfg.evaluatorModel,
      },
    };
    saveConfig(updatedConfig);
    setScreen("ready");
  };

  const handleReadyDone = (): void => {
    process.exit(0);
  };

  switch (screen) {
    case "welcome":
      return <Welcome onContinue={handleWelcomeContinue} />;
    case "prereqs":
      return <PrereqsCheck onDone={handlePrereqsDone} />;
    case "config":
      return <ConfigWizard onSave={handleConfigSave} />;
    case "ready":
      return <ReadyScreen onDone={handleReadyDone} />;
    case "halted":
      return (
        <Text color="red">
          {"Setup halted: one or more critical prerequisites failed. Please install the missing dependencies and run salazar again."}
        </Text>
      );
    default: {
      const _exhaustive: never = screen;
      return <Text>Unknown wizard screen</Text>;
    }
  }
}

// ---------------------------------------------------------------------------
// Public OnboardingWizard
// ---------------------------------------------------------------------------

export function OnboardingWizard(): React.ReactElement {
  return <WizardStateMachine />;
}

// ---------------------------------------------------------------------------
// View components
// ---------------------------------------------------------------------------

function RunView({ specPath }: { specPath?: string }): React.ReactElement {
  if (!specPath) {
    return <Text color="red">{"Error: no spec file provided. Usage: salazar run <spec.md>"}</Text>;
  }
  return <RunDashboard specPath={specPath} />;
}

function ConfigView(): React.ReactElement {
  const config = loadConfig();

  const handleSave = (cfg: WizardConfig): void => {
    const updatedConfig: SalazarConfig = {
      ...config,
      models: {
        ...config.models,
        generator: cfg.generatorModel,
        evaluator: cfg.evaluatorModel,
      },
    };
    saveConfig(updatedConfig);
    console.log("[ok] Configuration saved");
    process.exit(0);
  };

  const initialValues: WizardConfig = {
    generatorModel: config.models.generator,
    evaluatorModel: config.models.evaluator,
  };

  return <ConfigWizard onSave={handleSave} initialValues={initialValues} />;
}

function HistoryView(): React.ReactElement {
  const sessions = loadSessions();
  return (
    <InteractiveHistoryList
      sessions={sessions}
      onExit={() => process.exit(0)}
    />
  );
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

export type AppView = "onboarding" | "run" | "config" | "history";

export interface AppProps {
  command?: string;
  specPath?: string;
  firstRun?: boolean;
}

export function selectView(
  command: string | undefined,
  _firstRun: boolean,
): AppView {
  switch (command) {
    case "run":
      return "run";
    case "config":
      return "config";
    case "history":
      return "history";
    default:
      return "onboarding";
  }
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function App({ command, specPath, firstRun }: AppProps): React.ReactElement {
  const isFirst = firstRun ?? isFirstRun();
  const view = selectView(command, isFirst);

  switch (view) {
    case "run":
      return <RunView specPath={specPath} />;
    case "config":
      return <ConfigView />;
    case "history":
      return <HistoryView />;
    case "onboarding":
    default:
      return <OnboardingWizard />;
  }
}
