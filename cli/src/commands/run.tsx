/**
 * run command handler.
 *
 * Invoked when the user runs `harness run <spec>`.
 * Receives the path to the feature spec and starts a harness session.
 */

import { existsSync } from "node:fs";
import React from "react";
import { render } from "ink";
import { readConfig } from "../lib/config.js";
import { RunDashboard } from "../components/run-dashboard.js";
import type { HarnessConfig } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * CLI flags accepted by the `harness run` command.
 *
 * All fields are optional because the user may omit any flag, in which case
 * the corresponding value is taken from the harness config defaults.
 */
export interface RunFlags {
  /** Model override for the generator agent (e.g. 'claude-opus-4-6'). */
  model?: string;
  /** Model override for the evaluator agent. */
  modelEvaluator?: string;
  /** Dashboard URL override. */
  dashboardUrl?: string;
  /** When true, run multiple features in parallel. */
  multi?: boolean;
  /** When true, run a single feature (default mode). */
  single?: boolean;
}

/**
 * Fully-resolved options for a harness run, with all defaults applied.
 *
 * Produced by {@link buildHarnessOptions} from a combination of CLI flags and
 * the user's harness config.
 */
export interface HarnessRunOptions {
  /** Path to the feature spec markdown file. */
  specPath: string;
  /** Model to use for the generator agent. */
  model: string;
  /** Model to use for the evaluator agent. */
  modelEvaluator: string;
  /** Dashboard URL. */
  dashboardUrl: string;
  /** Whether to run multiple features in parallel. */
  multi: boolean;
  /** Whether to run in single-feature mode. */
  single: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Merges CLI flags with harness config defaults to produce a fully-resolved
 * {@link HarnessRunOptions} object.
 *
 * Precedence (highest → lowest):
 * 1. Explicit CLI flag value
 * 2. Corresponding value from {@link HarnessConfig}
 * 3. Hard-coded fallback (for boolean flags)
 *
 * @param specPath - Path to the feature spec file.
 * @param flags - Parsed CLI flags from the `run` sub-command.
 * @param config - The fully-merged harness config (from {@link readConfig}).
 * @returns A {@link HarnessRunOptions} object with every field populated.
 *
 * @example
 * ```ts
 * const config = readConfig();
 * const options = buildHarnessOptions('spec.md', { model: 'claude-opus-4-6' }, config);
 * // options.model === 'claude-opus-4-6'           (from flag)
 * // options.modelEvaluator === config.models.evaluator  (from config)
 * ```
 */
export function buildHarnessOptions(
  specPath: string,
  flags: RunFlags,
  config: HarnessConfig
): HarnessRunOptions {
  return {
    specPath,
    model: flags.model ?? config.models.default,
    modelEvaluator: flags.modelEvaluator ?? config.models.evaluator,
    dashboardUrl: flags.dashboardUrl ?? config.dashboard.url,
    multi: flags.multi ?? false,
    single: flags.single ?? false,
  };
}

/**
 * Execute the `run` command with the given spec file path and optional flags.
 *
 * Validates that the spec file exists on disk before attempting to spawn the
 * Python harness process. If the file is absent, prints a descriptive error
 * message to stderr and exits the process with code 1.
 *
 * When the file exists, CLI flags are merged with config defaults via
 * {@link buildHarnessOptions} to produce the final harness run options.
 *
 * @param specPath - Path to the feature spec markdown file to run.
 * @param flags - Optional CLI flags to override config defaults.
 */
export async function runCommand(
  specPath: string,
  flags: RunFlags = {}
): Promise<void> {
  if (!existsSync(specPath)) {
    console.error(`Error: spec file not found: ${specPath}`);
    process.exit(1);
    // Guard: ensures execution stops when process.exit is mocked in tests.
    return;
  }

  const config = readConfig();
  const options = buildHarnessOptions(specPath, flags, config);

  // Emit a routing confirmation log (used by the command routing tests).
  console.log(`run command received: ${specPath}`);

  // Render the live progress dashboard.
  // waitUntilExit() is intentionally not awaited: in real TTY usage the
  // process stays alive via the Ink event loop; in tests the function returns
  // immediately so assertions can run synchronously.
  // patchConsole: false prevents Ink from replacing console.log with its own
  // patched version, which would break test spies set up before render().
  render(React.createElement(RunDashboard, { specPath, options, config }), {
    patchConsole: false,
  });
}
