/**
 * app.tsx — Root Ink component for the harness CLI.
 *
 * Routes to the onboarding wizard on first run (when no config exists and no
 * subcommand was given), or to the appropriate command component when a
 * subcommand is provided.
 *
 * Full implementations of each sub-component are added in later features
 * (F036-F063). The stubs here exist so routing can be tested independently.
 */

import React, { useState } from "react";
import { Text } from "ink";
import { isFirstRun, writeConfig, DEFAULT_CONFIG } from "./lib/config.js";
import { Welcome } from "./components/welcome.js";
import { PrereqsCheck } from "./components/prereqs.js";
import { ConfigWizard, type WizardConfig } from "./components/config-wizard.js";
import { ReadyScreen } from "./components/welcome.js";

// ---------------------------------------------------------------------------
// Wizard state machine types
// ---------------------------------------------------------------------------

/**
 * The screens of the onboarding wizard.
 *
 * The state machine advances only forward:
 * `welcome` → `prereqs` → `config` → `ready`
 *
 * If critical prerequisites fail the machine transitions to `halted` instead
 * of `config`, and the wizard does not advance further.
 */
export type WizardScreen = "welcome" | "prereqs" | "config" | "ready" | "halted";

// ---------------------------------------------------------------------------
// Internal wizard state machine component (owns React hooks)
// ---------------------------------------------------------------------------

/**
 * Internal multi-step wizard that manages state transitions between the four
 * onboarding screens.
 *
 * Each screen advances the wizard **only** when its completion callback is
 * invoked — i.e. state advances are driven by the screens themselves, not by
 * timers or side-effects. Backward navigation is not supported.
 *
 * Screens in order:
 *  1. `welcome`  — {@link Welcome}, advances on Enter key
 *  2. `prereqs`  — {@link PrereqsCheck}, advances when checks complete
 *  3. `config`   — {@link ConfigWizard}, advances after all prompts answered
 *  4. `ready`    — {@link ReadyScreen}, shown after config is saved
 *
 * @internal
 */
function WizardStateMachine(): React.ReactElement {
  const [screen, setScreen] = useState<WizardScreen>("welcome");
  const [_savedConfig, setSavedConfig] = useState<WizardConfig | null>(null);

  /** Advance from welcome → prereqs. */
  const handleWelcomeContinue = (): void => {
    setScreen("prereqs");
  };

  /**
   * Advance from prereqs → config when all checks pass.
   *
   * When `allPassed` is `true` the wizard advances to the config screen.
   * When `allPassed` is `false` (at least one critical prerequisite failed)
   * the wizard transitions to the `halted` screen and does **not** advance
   * to config — satisfying the F043 requirement.
   */
  const handlePrereqsDone = (allPassed: boolean): void => {
    if (allPassed) {
      setScreen("config");
    } else {
      setScreen("halted");
    }
  };

  /** Advance from config → ready, persisting the collected config to disk. */
  const handleConfigSave = (cfg: WizardConfig): void => {
    // Map WizardConfig fields into the full HarnessConfig structure and persist.
    const harnessConfig = {
      ...DEFAULT_CONFIG,
      models: {
        ...DEFAULT_CONFIG.models,
        generator: cfg.generatorModel,
        evaluator: cfg.evaluatorModel,
      },
      dashboard: {
        url: cfg.dashboardUrl,
        secret: cfg.dashboardSecret,
      },
    };
    writeConfig(harnessConfig);
    setSavedConfig(cfg);
    setScreen("ready");
  };

  /** Finish the wizard — all screens are done. */
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
          {"✗ Setup halted: one or more critical prerequisites failed. Please install the missing dependencies and run the harness again."}
        </Text>
      );
    default: {
      // TypeScript exhaustiveness guard
      const _exhaustive: never = screen;
      return <Text>Unknown wizard screen</Text>;
    }
  }
}

// ---------------------------------------------------------------------------
// Public OnboardingWizard (wraps the state machine, no hooks at this level)
// ---------------------------------------------------------------------------

/**
 * Onboarding wizard rendered on first run.
 *
 * Orchestrates a four-screen state machine:
 * **welcome → prereqs → config → ready**
 *
 * The wizard delegates all hook-based state to the internal
 * {@link WizardStateMachine} component so that this function can be called
 * directly in tests without violating React's rules of hooks.
 *
 * @returns A React element that mounts the full onboarding flow.
 */
export function OnboardingWizard(): React.ReactElement {
  return <WizardStateMachine />;
}

/**
 * Run command view — starts a harness session for the given spec file.
 * Full implementation: F049.
 *
 * @internal
 */
export function RunView({ specPath }: { specPath?: string }): React.ReactElement {
  return <Text>run: {specPath ?? "(no spec)"}</Text>;
}

/**
 * Config command view — opens the interactive configuration editor.
 * Full implementation: F050.
 *
 * @internal
 */
export function ConfigView(): React.ReactElement {
  return <Text>config</Text>;
}

/**
 * History command view — browses past harness session history.
 * Full implementation: F051-F063.
 *
 * @internal
 */
export function HistoryView(): React.ReactElement {
  return <Text>history</Text>;
}

// ---------------------------------------------------------------------------
// Public types & routing helper
// ---------------------------------------------------------------------------

/** The set of named views the App can render. */
export type AppView = "onboarding" | "run" | "config" | "history";

/** Props accepted by the root {@link App} component. */
export interface AppProps {
  /**
   * The subcommand to route to (e.g. `'run'`, `'config'`, `'history'`).
   * `undefined` when the user typed no subcommand.
   */
  command?: string;

  /**
   * Path to the feature spec file — only relevant for the `'run'` command.
   */
  specPath?: string;

  /**
   * Override for the first-run detection. When omitted the component calls
   * {@link isFirstRun} itself. Providing this explicitly makes unit testing
   * straightforward without touching the filesystem.
   */
  firstRun?: boolean;
}

/**
 * Pure routing function that maps `(command, firstRun)` to an {@link AppView}.
 *
 * Rules:
 * - No command **and** first-run → `"onboarding"`
 * - `"run"` → `"run"` (regardless of first-run status)
 * - `"config"` → `"config"` (regardless of first-run status)
 * - `"history"` → `"history"` (regardless of first-run status)
 * - Any other value (including no command when not first-run) → `"onboarding"`
 *
 * @param command  - The subcommand string, or `undefined` if none was given.
 * @param firstRun - Whether this is a first-run (no config file present).
 * @returns The view name to render.
 */
export function selectView(
  command: string | undefined,
  firstRun: boolean
): AppView {
  switch (command) {
    case "run":
      return "run";
    case "config":
      return "config";
    case "history":
      return "history";
    default:
      // No recognised command — always go to onboarding (covers both the
      // first-run case and the "no args given" case).
      return "onboarding";
  }
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

/**
 * Root Ink component for the harness CLI.
 *
 * Reads the subcommand and first-run status and renders the appropriate
 * sub-component:
 *
 * - No command + first run → {@link OnboardingWizard}
 * - `run`                  → {@link RunView}
 * - `config`               → {@link ConfigView}
 * - `history`              → {@link HistoryView}
 * - Anything else          → {@link OnboardingWizard}
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { App } from './app.js';
 *
 * render(<App command="run" specPath="features/login.md" />);
 * ```
 */
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
