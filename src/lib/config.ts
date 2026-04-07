import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { getConfigPath, ensureRuntimeDirs } from "./paths.js";
import type { SalazarConfig } from "./types.js";

const DEFAULTS: SalazarConfig = {
  models: {
    default: "claude-sonnet-4-6",
    planner: "claude-sonnet-4-6",
    generator: "claude-sonnet-4-6",
    evaluator: "claude-sonnet-4-6",
  },
  output: { defaultDir: "" },
};

export function loadConfig(): SalazarConfig {
  ensureRuntimeDirs();
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return { ...DEFAULTS, models: { ...DEFAULTS.models } };
  }
  const raw = JSON.parse(readFileSync(configPath, "utf-8")) as Partial<SalazarConfig>;
  return { ...DEFAULTS, ...raw, models: { ...DEFAULTS.models, ...raw.models } };
}

export function saveConfig(config: SalazarConfig): void {
  ensureRuntimeDirs();
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}
