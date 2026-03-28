/**
 * Config reader for the harness CLI.
 *
 * Reads `~/.harness/config.json` and merges any missing optional fields
 * with built-in defaults so callers always receive a fully-populated
 * {@link HarnessConfig} object.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import type {
  HarnessConfig,
  HarnessConfigDashboard,
  HarnessConfigModels,
  HarnessConfigOutput,
  HarnessConfigPython,
  HarnessHistoryEntry,
} from "./types.js";

// ---------------------------------------------------------------------------
// Default config values
// ---------------------------------------------------------------------------

/** Default model identifiers used when no overrides are present in config. */
const DEFAULT_MODELS: HarnessConfigModels = {
  default: "claude-opus-4-5",
  planner: "claude-opus-4-5",
  generator: "claude-sonnet-4-5",
  evaluator: "claude-haiku-3-5",
};

/** Default dashboard settings. */
const DEFAULT_DASHBOARD: HarnessConfigDashboard = {
  url: "http://localhost:3000",
  secret: "",
};

/** Default output directory settings. */
const DEFAULT_OUTPUT: HarnessConfigOutput = {
  defaultDir: join(homedir(), ".harness", "output"),
};

/** Default Python interpreter settings. */
const DEFAULT_PYTHON: HarnessConfigPython = {
  path: "python3",
  venvPath: "",
};

/**
 * The fully-populated default {@link HarnessConfig}.
 *
 * Every field is defined so that callers can rely on a complete object even
 * when the on-disk config file is absent or only partially filled.
 */
export const DEFAULT_CONFIG: HarnessConfig = {
  models: DEFAULT_MODELS,
  dashboard: DEFAULT_DASHBOARD,
  output: DEFAULT_OUTPUT,
  python: DEFAULT_PYTHON,
  history: [],
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `value` is a plain (non-null, non-array) object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deeply merges `source` into `target`, returning a new object where every
 * field from `target` (the defaults) is preserved and any matching field from
 * `source` (the on-disk config) overrides the default.
 *
 * Arrays are replaced wholesale — the source array takes precedence.
 *
 * @internal
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: unknown
): T {
  if (!isPlainObject(source)) {
    return target;
  }

  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(target)) {
    const targetVal = target[key];
    const sourceVal = (source as Record<string, unknown>)[key];

    if (sourceVal === undefined) {
      // Source doesn't have this field — keep the default.
      continue;
    }

    if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
      // Both are objects — recurse.
      result[key] = deepMerge(targetVal, sourceVal);
    } else {
      // Primitive, array, or type mismatch — source wins.
      result[key] = sourceVal;
    }
  }

  // Also include any keys from source that aren't in target.
  for (const key of Object.keys(source)) {
    if (!(key in result)) {
      result[key] = (source as Record<string, unknown>)[key];
    }
  }

  return result as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The canonical path to the harness config file.
 *
 * Exported so tests and other utilities can reference it without
 * hard-coding the value.
 */
export const CONFIG_FILE_PATH: string = join(
  homedir(),
  ".harness",
  "config.json"
);

/**
 * Reads the harness configuration from disk and fills any missing fields
 * with built-in defaults.
 *
 * The function never throws — if the config file is absent or contains
 * invalid JSON the entire {@link DEFAULT_CONFIG} is returned.
 *
 * @param configPath - Override the path to the config file. Defaults to
 *   `~/.harness/config.json`. Useful for testing.
 * @returns A fully-populated {@link HarnessConfig} object.
 *
 * @example
 * ```ts
 * import { readConfig } from './lib/config.js';
 *
 * const config = readConfig();
 * console.log(config.models.default); // e.g. 'claude-opus-4-5'
 * ```
 */
/**
 * Writes a {@link HarnessConfig} object to disk as JSON.
 *
 * If the target directory (e.g. `~/.harness/`) does not yet exist it is
 * created recursively before the file is written.  The JSON is pretty-printed
 * with two-space indentation so the file stays human-readable.
 *
 * @param config - The configuration object to persist.
 * @param configPath - Override the target file path. Defaults to
 *   `~/.harness/config.json`. Useful for testing.
 *
 * @example
 * ```ts
 * import { writeConfig } from './lib/config.js';
 *
 * writeConfig({ ...existingConfig, models: { ...existingConfig.models, default: 'claude-opus-4-6' } });
 * ```
 */
export function writeConfig(
  config: HarnessConfig,
  configPath: string = CONFIG_FILE_PATH
): void {
  const dir = dirname(configPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Determines whether this is the first time the harness CLI is being run on
 * this machine by checking whether the config file exists on disk.
 *
 * @param configPath - Override the path to the config file. Defaults to
 *   `~/.harness/config.json`. Useful for testing.
 * @returns `true` when the config file is absent (first run), `false` when it
 *   already exists.
 *
 * @example
 * ```ts
 * import { isFirstRun } from './lib/config.js';
 *
 * if (isFirstRun()) {
 *   // Show the setup wizard.
 * }
 * ```
 */
export function isFirstRun(configPath: string = CONFIG_FILE_PATH): boolean {
  return !existsSync(configPath);
}

/**
 * Sets a single key in the harness config file using dot-notation path.
 *
 * Reads the current config from disk, updates the value at the given
 * dot-separated key path (e.g. `'models.default'`), then writes the
 * updated config back to disk.  All other keys remain unchanged.
 *
 * @param keyPath - Dot-separated path to the config key, e.g. `'models.default'`
 *   or `'dashboard.url'`.
 * @param value - The new value to assign at the given path. Must be a JSON-
 *   serialisable primitive or object.
 * @param configPath - Override the path to the config file. Defaults to
 *   `~/.harness/config.json`. Useful for testing.
 * @throws {Error} When `keyPath` is empty or any intermediate segment resolves
 *   to a non-object value (which would prevent descending further).
 *
 * @example
 * ```ts
 * import { setConfigKey } from './lib/config.js';
 *
 * setConfigKey('models.default', 'claude-opus-4-6');
 * // ~/.harness/config.json now has models.default === 'claude-opus-4-6'
 * ```
 */
export function setConfigKey(
  keyPath: string,
  value: unknown,
  configPath: string = CONFIG_FILE_PATH
): void {
  if (!keyPath || keyPath.trim() === "") {
    throw new Error("keyPath must not be empty");
  }

  const config = readConfig(configPath);
  const segments = keyPath.split(".");

  // Walk the config object, creating a mutable reference tree.
  let current: Record<string, unknown> = config as unknown as Record<
    string,
    unknown
  >;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i] as string;
    const next = current[segment];

    if (!isPlainObject(next)) {
      throw new Error(
        `Cannot set key '${keyPath}': '${segment}' is not an object (got ${typeof next})`
      );
    }

    current = next;
  }

  const lastSegment = segments[segments.length - 1] as string;
  current[lastSegment] = value;

  writeConfig(config, configPath);
}

export function readConfig(configPath: string = CONFIG_FILE_PATH): HarnessConfig {
  let raw: unknown = {};

  try {
    const content = readFileSync(configPath, "utf-8");
    raw = JSON.parse(content) as unknown;
  } catch {
    // File absent, unreadable, or invalid JSON — fall back to full defaults.
    raw = {};
  }

  const merged = deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, raw);

  // Ensure history is always an array of HarnessHistoryEntry.
  const history: HarnessHistoryEntry[] = Array.isArray(
    (merged as Record<string, unknown>)["history"]
  )
    ? ((merged as Record<string, unknown>)["history"] as HarnessHistoryEntry[])
    : [];

  return {
    ...(merged as unknown as HarnessConfig),
    history,
  };
}
