/**
 * Prerequisites checker for the harness CLI.
 *
 * Verifies that the system meets minimum requirements before running the harness.
 */

import { execSync } from "node:child_process";

/** Result returned by a prerequisite check. */
export type PrereqResult =
  | { passed: true; version: string }
  | { passed: false; hint: string };

/**
 * Checks that Node.js >= 20 is available on the system.
 *
 * Runs `node --version` as a subprocess and parses the output. Returns a
 * {@link PrereqResult} indicating whether the version requirement is satisfied.
 *
 * @returns `{ passed: true, version: 'vX.Y.Z' }` when Node.js major version is
 *   >= 20, or `{ passed: false, hint: '...' }` otherwise.
 *
 * @example
 * ```ts
 * const result = checkNode();
 * if (!result.passed) {
 *   console.error(result.hint);
 *   process.exit(1);
 * }
 * ```
 */
export function checkNode(): PrereqResult {
  let version: string;

  try {
    version = execSync("node --version", { encoding: "utf-8" }).trim();
  } catch {
    return {
      passed: false,
      hint: "Node.js is not installed or not on PATH. Install Node.js >= 20 from https://nodejs.org",
    };
  }

  // version looks like "v20.11.0"
  const match = /^v(\d+)\./.exec(version);
  if (!match) {
    return {
      passed: false,
      hint: `Could not parse Node.js version string: "${version}". Install Node.js >= 20 from https://nodejs.org`,
    };
  }

  const major = parseInt(match[1], 10);

  if (major >= 20) {
    return { passed: true, version };
  }

  return {
    passed: false,
    hint: `Node.js >= 20 is required, but found ${version}. Upgrade at https://nodejs.org`,
  };
}

/**
 * Checks that the `claude-agent-sdk` Python package is installed and importable.
 *
 * Runs `python3 -c 'import claude_agent_sdk; print(claude_agent_sdk.__version__)'`
 * as a subprocess and parses the output. Returns a {@link PrereqResult} indicating
 * whether the package is available.
 *
 * @returns `{ passed: true, version: 'X.Y.Z' }` when the package imports
 *   successfully, or `{ passed: false, hint: 'pip install claude-agent-sdk' }`
 *   if an ImportError occurs or the package is not found.
 *
 * @example
 * ```ts
 * const result = checkSdk();
 * if (!result.passed) {
 *   console.error(result.hint);
 *   process.exit(1);
 * }
 * ```
 */
export function checkSdk(): PrereqResult {
  let raw: string;

  try {
    raw = execSync(
      "python3 -c 'import claude_agent_sdk; print(claude_agent_sdk.__version__)'",
      { encoding: "utf-8" },
    ).trim();
  } catch {
    return { passed: false, hint: "pip install claude-agent-sdk" };
  }

  if (!raw) {
    return { passed: false, hint: "pip install claude-agent-sdk" };
  }

  return { passed: true, version: raw };
}

/**
 * Checks that Python 3.11+ is available on the system.
 *
 * Runs `python3 --version` as a subprocess and parses the output. Returns a
 * {@link PrereqResult} indicating whether the version requirement is satisfied.
 *
 * @returns `{ passed: true, version: '3.X.Y' }` when Python major version is
 *   3 and minor version is >= 11, or `{ passed: false, hint: 'Install Python 3.11+' }`
 *   otherwise.
 *
 * @example
 * ```ts
 * const result = checkPython();
 * if (!result.passed) {
 *   console.error(result.hint);
 *   process.exit(1);
 * }
 * ```
 */
/**
 * Checks that the Claude CLI is installed and accessible on the system.
 *
 * Runs `claude --version` as a subprocess. Returns a {@link PrereqResult}
 * indicating whether the CLI is available.
 *
 * @returns `{ passed: true }` when `claude --version` exits successfully,
 *   or `{ passed: false, hint: 'Install Claude CLI and authenticate' }` on failure.
 *
 * @example
 * ```ts
 * const result = checkClaudeCli();
 * if (!result.passed) {
 *   console.error(result.hint);
 *   process.exit(1);
 * }
 * ```
 */
export function checkClaudeCli(): PrereqResult {
  try {
    execSync("claude --version", { encoding: "utf-8" });
  } catch {
    return { passed: false, hint: "Install Claude CLI and authenticate" };
  }

  return { passed: true, version: "" };
}

export function checkPython(): PrereqResult {
  let raw: string;

  try {
    raw = execSync("python3 --version", { encoding: "utf-8" }).trim();
  } catch {
    return { passed: false, hint: "Install Python 3.11+" };
  }

  // Output looks like "Python 3.11.2"
  const match = /^Python (\d+)\.(\d+)\.(\d+)/.exec(raw);
  if (!match) {
    return { passed: false, hint: "Install Python 3.11+" };
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const version = `${match[1]}.${match[2]}.${match[3]}`;

  if (major === 3 && minor >= 11) {
    return { passed: true, version };
  }

  return { passed: false, hint: "Install Python 3.11+" };
}

/**
 * Aggregated result from {@link checkAll}, including the check name.
 *
 * Each object describes one prerequisite check with a human-readable name,
 * a pass/fail status, an optional version string (present when the check
 * passed), and an optional remediation hint (present when the check failed).
 */
export interface NamedPrereqResult {
  /** Human-readable identifier for the check (e.g. `'node'`, `'python'`). */
  name: string;
  /** Whether the prerequisite check passed. */
  passed: boolean;
  /** Detected version string, populated when `passed` is `true`. */
  version?: string;
  /** Actionable remediation hint, populated when `passed` is `false`. */
  hint?: string;
}

/**
 * Runs all prerequisite checks and aggregates their results.
 *
 * Executes {@link checkNode}, {@link checkPython}, {@link checkSdk}, and
 * {@link checkClaudeCli} in sequence and returns one {@link NamedPrereqResult}
 * per check. Each result carries the check's name alongside the pass/fail
 * status and, where applicable, a version string or remediation hint.
 *
 * @returns An array of {@link NamedPrereqResult} objects — one per check —
 *   in the order: node, python, sdk, claude-cli.
 *
 * @example
 * ```ts
 * const results = checkAll();
 * const allPassed = results.every(r => r.passed);
 * if (!allPassed) {
 *   results.filter(r => !r.passed).forEach(r => console.error(r.hint));
 *   process.exit(1);
 * }
 * ```
 */
export function checkAll(): NamedPrereqResult[] {
  const checks: Array<[string, () => PrereqResult]> = [
    ["node", checkNode],
    ["python", checkPython],
    ["sdk", checkSdk],
    ["claude-cli", checkClaudeCli],
  ];

  return checks.map(([name, fn]) => {
    const result = fn();
    if (result.passed) {
      return { name, passed: true, version: result.version };
    }
    return { name, passed: false, hint: result.hint };
  });
}
