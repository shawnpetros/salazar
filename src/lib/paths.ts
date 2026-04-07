import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

function getHome(): string {
  return process.env.SALAZAR_HOME ?? join(homedir(), ".salazar");
}

// Lazy getters so that SALAZAR_HOME overrides in tests are respected at call time.
export function getAppDir(): string { return getHome(); }
export function getOutputDir(): string { return join(getHome(), "output"); }
export function getLogDir(): string { return join(getHome(), "logs"); }
export function getDbPath(): string { return join(getHome(), "salazar.db"); }
export function getConfigPath(): string { return join(getHome(), "config.json"); }

// Static exports for consumers that read the path once at startup (non-test code).
// These still resolve SALAZAR_HOME at the time the module is first imported.
const home = getHome();
export const APP_DIR = home;
export const OUTPUT_DIR = join(home, "output");
export const LOG_DIR = join(home, "logs");
export const DB_PATH = join(home, "salazar.db");
export const CONFIG_PATH = join(home, "config.json");

export function ensureRuntimeDirs(): void {
  for (const dir of [getAppDir(), getOutputDir(), getLogDir()]) {
    mkdirSync(dir, { recursive: true });
  }
}
