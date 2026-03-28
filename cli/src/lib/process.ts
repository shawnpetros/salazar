/**
 * lib/process.ts — Python harness process management
 *
 * Provides utilities for spawning and managing the Python harness orchestrator
 * as a child process via execa.
 */

import { execa } from "execa";
import type { ResultPromise } from "execa";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { HarnessConfig } from "./types.js";

// ---------------------------------------------------------------------------
// killHarness
// ---------------------------------------------------------------------------

/**
 * Terminates a running Python harness child process gracefully.
 *
 * Sends SIGTERM to the child process and awaits its exit.  If the process has
 * already exited (or was never started) the function resolves immediately
 * without throwing.  Any errors thrown during the kill sequence (e.g. the
 * process already exited, `ESRCH` "no such process") are swallowed so that
 * callers can treat `killHarness` as a fire-and-forget cleanup step.
 *
 * This function is also suitable as the body of a `process.on('SIGINT', ...)`
 * handler so that pressing Ctrl-C in the terminal tears down the child process
 * before the Node.js host exits.
 *
 * @param proc - The {@link ResultPromise} handle returned by {@link spawnHarness}.
 * @returns A `Promise<void>` that resolves once the child process has exited (or
 *   was already dead).  The promise never rejects.
 *
 * @example
 * ```ts
 * const proc = spawnHarness('spec.md', { model: 'claude-sonnet-4-6' });
 *
 * // Explicit kill
 * await killHarness(proc);
 *
 * // SIGINT handler
 * process.on('SIGINT', () => killHarness(proc).finally(() => process.exit(1)));
 * ```
 */
export async function killHarness(proc: ResultPromise): Promise<void> {
  try {
    proc.kill("SIGTERM");
    // Await the process exit so callers can sequence cleanup after termination.
    // We cast to Promise to avoid TS complaints about awaiting ResultPromise directly.
    await (proc as unknown as Promise<unknown>).catch(() => {
      // Swallow exit errors — a killed process rejects with ExecaError.
    });
  } catch {
    // Swallow any synchronous errors (e.g. process already exited).
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options accepted by {@link spawnHarness} when launching the Python harness.
 */
export interface SpawnHarnessOptions {
  /** Model identifier forwarded to the harness via `--model`. */
  model?: string;
  /** Absolute path to the log file where harness JSONL output is written. */
  logPath?: string;
}

/**
 * Runtime flags that can be passed to {@link buildHarnessArgs} to override
 * values that would otherwise be sourced from the harness config file.
 *
 * All fields are optional — when absent the corresponding value from
 * `config` is used instead.
 */
export interface BuildHarnessArgsOptions {
  /**
   * Override the generator model (`--model`).
   * Falls back to `config.models.default` when absent.
   */
  model?: string;
  /**
   * Override the evaluator model (`--model-evaluator`).
   * Falls back to `config.models.evaluator` when absent.
   */
  modelEvaluator?: string;
  /**
   * Override the dashboard URL (`--dashboard-url`).
   * Falls back to `config.dashboard.url` when absent.
   */
  dashboardUrl?: string;
  /**
   * When `true`, passes the `--multi` flag to enable multi-agent mode.
   * Defaults to `false`.
   */
  multi?: boolean;
}

// ---------------------------------------------------------------------------
// spawnHarness
// ---------------------------------------------------------------------------

/**
 * Spawns the Python harness orchestrator as a child process.
 *
 * Executes `python3 -m harness <specPath> [flags]` using execa, passing any
 * provided options as CLI flags.  The returned handle gives the caller access
 * to the child process stdio streams and the ability to await completion or
 * kill the process.
 *
 * @param specPath - Path to the feature spec file passed to the harness (e.g. `'spec.md'`).
 * @param options  - Optional runtime flags: `model` and `logPath`.
 * @returns An {@link ResultPromise} handle for the spawned python3 child process.
 *
 * @example
 * ```ts
 * const proc = spawnHarness('spec.md', {
 *   model: 'claude-sonnet-4-6',
 *   logPath: '/tmp/run.log',
 * });
 * proc.stdout?.on('data', (chunk) => process.stdout.write(chunk));
 * await proc;
 * ```
 */
export function spawnHarness(
  specPath: string,
  options: SpawnHarnessOptions = {}
): ResultPromise {
  const args: string[] = ["-m", "harness", specPath];

  if (options.model !== undefined) {
    args.push("--model", options.model);
  }

  if (options.logPath !== undefined) {
    args.push("--log", options.logPath);
  }

  return execa("python3", args);
}

// ---------------------------------------------------------------------------
// createLogPath
// ---------------------------------------------------------------------------

/**
 * Creates the `~/.harness/logs/` directory (if it does not already exist) and
 * returns the absolute path to the log file for the given session.
 *
 * The returned path follows the convention:
 * `~/.harness/logs/<sessionId>.log`
 *
 * @param sessionId - Unique identifier for the session (used as the filename stem).
 * @returns Absolute path to the log file for the given session.
 *
 * @example
 * ```ts
 * const logPath = createLogPath('abc-123');
 * // → '/Users/you/.harness/logs/abc-123.log'
 * ```
 */
export function createLogPath(sessionId: string): string {
  const logsDir = path.join(os.homedir(), ".harness", "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  return path.join(logsDir, `${sessionId}.log`);
}

// ---------------------------------------------------------------------------
// buildHarnessArgs
// ---------------------------------------------------------------------------

/**
 * Builds the array of CLI arguments to pass to the Python harness process.
 *
 * Merges run-time flag overrides from `options` on top of config-file defaults
 * from `config`, then assembles the complete `python3 -m harness` argument
 * list.
 *
 * Precedence (highest to lowest):
 *  1. Values explicitly provided in `options`
 *  2. Values from `config` (e.g. `config.models.default`)
 *
 * The returned array is suitable for passing directly as the `args` argument
 * to `execa('python3', args)`.
 *
 * @param specPath - Path to the feature spec file (e.g. `'spec.md'`).
 * @param options  - Optional per-run flag overrides. Any field left `undefined`
 *   falls back to the corresponding `config` value.
 * @param config   - Harness configuration loaded from disk (or a test fixture).
 * @returns Array of CLI argument strings starting with `['-m', 'harness', specPath, ...]`.
 *
 * @example
 * ```ts
 * const args = buildHarnessArgs('spec.md', { model: 'claude-opus-4-6' }, config);
 * // → ['-m', 'harness', 'spec.md', '--model', 'claude-opus-4-6', '--model-evaluator', 'claude-haiku-3-5', '--dashboard-url', 'http://localhost:3000']
 * const proc = execa('python3', args);
 * ```
 */
export function buildHarnessArgs(
  specPath: string,
  options: BuildHarnessArgsOptions,
  config: HarnessConfig
): string[] {
  const args: string[] = ["-m", "harness", specPath];

  // --model: option override takes precedence over config default
  const model = options.model ?? config.models.default;
  args.push("--model", model);

  // --model-evaluator: option override takes precedence over config evaluator
  const modelEvaluator = options.modelEvaluator ?? config.models.evaluator;
  args.push("--model-evaluator", modelEvaluator);

  // --dashboard-url: option override takes precedence over config dashboard url
  const dashboardUrl = options.dashboardUrl ?? config.dashboard.url;
  args.push("--dashboard-url", dashboardUrl);

  // --multi: boolean flag, only appended when true
  if (options.multi === true) {
    args.push("--multi");
  }

  return args;
}
