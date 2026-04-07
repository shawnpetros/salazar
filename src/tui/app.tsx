/**
 * app.tsx -- Root Ink component for the Salazar CLI.
 *
 * Routes to the onboarding wizard on first run (when no config exists and no
 * subcommand was given), or to the launcher for returning users, or to the
 * appropriate command component when a subcommand is provided.
 *
 * First-run state machine:
 *   welcome -> prereqs -> config -> launcher
 *
 * Returning user:
 *   launcher (directly)
 *
 * Launcher -> New Build -> RunDashboard
 * Launcher -> Settings  -> ConfigWizard -> launcher
 * Launcher -> History   -> InteractiveHistoryList -> launcher
 *
 * Command routing (headless / subcommand):
 *   "run"     -> RunDashboard
 *   "config"  -> ConfigWizard
 *   "history" -> InteractiveHistoryList
 */

import React, { useState } from "react";
import { Text } from "ink";
import { existsSync } from "node:fs";
import { loadConfig, saveConfig } from "../lib/config.js";
import { getConfigPath, getOutputDir } from "../lib/paths.js";
import { getDb } from "../engine/storage.js";
import type { SalazarConfig } from "../lib/types.js";
import { Welcome } from "./components/welcome.js";
import { PrereqsCheck } from "./components/prereqs.js";
import { ConfigWizard, type WizardConfig } from "./components/config-wizard.js";
import { RunDashboard } from "./components/run-dashboard.js";
import { Launcher, type LauncherAction } from "./components/launcher.js";
import { NewBuild, type NewBuildResult } from "./components/new-build.js";
import { InteractiveHistoryList, loadSessions } from "./commands/history.js";

// ---------------------------------------------------------------------------
// First-run detection
// ---------------------------------------------------------------------------

function isFirstRun(): boolean {
  return !existsSync(getConfigPath());
}

// ---------------------------------------------------------------------------
// Resume detection -- check for sessions with state='running' in SQLite
// ---------------------------------------------------------------------------

function hasResumableSession(): boolean {
  try {
    const db = getDb();
    const active = db.getActiveSessions();
    return active.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Screen types
// ---------------------------------------------------------------------------

export type Screen =
  | "welcome"
  | "prereqs"
  | "config"
  | "launcher"
  | "new-build"
  | "run"
  | "history"
  | "settings"
  | "halted";

// ---------------------------------------------------------------------------
// Internal TUI state machine component
// ---------------------------------------------------------------------------

function TuiStateMachine({ initialScreen }: { initialScreen: Screen }): React.ReactElement {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [runSpec, setRunSpec] = useState<string | null>(null);
  const [runOutputDir, setRunOutputDir] = useState<string | null>(null);

  // -- Welcome --
  const handleWelcomeContinue = (): void => {
    setScreen("prereqs");
  };

  // -- Prereqs --
  const handlePrereqsDone = (allPassed: boolean): void => {
    if (allPassed) {
      setScreen("config");
    } else {
      setScreen("halted");
    }
  };

  // -- Config (first-run) --
  const handleFirstRunConfigSave = (cfg: WizardConfig): void => {
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
    setScreen("launcher");
  };

  // -- Launcher --
  const handleLauncherSelect = (action: LauncherAction): void => {
    switch (action) {
      case "new-build":
        setScreen("new-build");
        break;
      case "history":
        setScreen("history");
        break;
      case "settings":
        setScreen("settings");
        break;
      case "resume":
        // For now, resume goes to launcher -- full resume support is future work
        setScreen("launcher");
        break;
    }
  };

  // -- New Build --
  const handleNewBuildConfirm = (result: NewBuildResult): void => {
    // Save lastOutputDir for next time
    const config = loadConfig();
    const updatedConfig: SalazarConfig = {
      ...config,
      lastOutputDir: result.outputDir,
    };
    saveConfig(updatedConfig);

    setRunSpec(result.specPath);
    setRunOutputDir(result.outputDir);
    setScreen("run");
  };

  const handleNewBuildCancel = (): void => {
    setScreen("launcher");
  };

  // -- Settings --
  const handleSettingsSave = (cfg: WizardConfig): void => {
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
    setScreen("launcher");
  };

  // -- History --
  const handleHistoryExit = (): void => {
    setScreen("launcher");
  };

  // -- Routing --
  switch (screen) {
    case "welcome":
      return <Welcome onContinue={handleWelcomeContinue} />;

    case "prereqs":
      return <PrereqsCheck onDone={handlePrereqsDone} />;

    case "config":
      return <ConfigWizard onSave={handleFirstRunConfigSave} />;

    case "launcher": {
      const resumable = hasResumableSession();
      return <Launcher hasResumable={resumable} onSelect={handleLauncherSelect} />;
    }

    case "new-build": {
      const config = loadConfig();
      const defaultDir = config.lastOutputDir || getOutputDir();
      const model = config.models.generator;
      return (
        <NewBuild
          defaultOutputDir={defaultDir}
          modelName={model}
          onConfirm={handleNewBuildConfirm}
          onCancel={handleNewBuildCancel}
        />
      );
    }

    case "run":
      if (!runSpec) {
        return <Text color="red">{"Error: no spec file provided."}</Text>;
      }
      return <RunDashboard specPath={runSpec} outputDir={runOutputDir ?? undefined} />;

    case "settings": {
      const config = loadConfig();
      const initialValues: WizardConfig = {
        generatorModel: config.models.generator,
        evaluatorModel: config.models.evaluator,
      };
      return <ConfigWizard onSave={handleSettingsSave} initialValues={initialValues} />;
    }

    case "history": {
      const sessions = loadSessions();
      return <InteractiveHistoryList sessions={sessions} onExit={handleHistoryExit} />;
    }

    case "halted":
      return (
        <Text color="red">
          {"Setup halted: one or more critical prerequisites failed. Please install the missing dependencies and run salazar again."}
        </Text>
      );

    default: {
      const _exhaustive: never = screen;
      return <Text>{"Unknown screen: "}{_exhaustive}</Text>;
    }
  }
}

// ---------------------------------------------------------------------------
// Public OnboardingWizard -- preserved for backward compatibility
// ---------------------------------------------------------------------------

export function OnboardingWizard(): React.ReactElement {
  return <TuiStateMachine initialScreen="welcome" />;
}

// ---------------------------------------------------------------------------
// View components for subcommand routing
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

export type AppView = "onboarding" | "launcher" | "run" | "config" | "history";

export interface AppProps {
  command?: string;
  specPath?: string;
  firstRun?: boolean;
}

export function selectView(
  command: string | undefined,
  firstRun: boolean,
): AppView {
  switch (command) {
    case "run":
      return "run";
    case "config":
      return "config";
    case "history":
      return "history";
    default:
      return firstRun ? "onboarding" : "launcher";
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
    case "launcher":
      return <TuiStateMachine initialScreen="launcher" />;
    case "onboarding":
    default:
      return <OnboardingWizard />;
  }
}
