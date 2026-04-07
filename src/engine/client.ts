import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getOutputDir, ensureRuntimeDirs } from "../lib/paths.js";
import { bashSecurityHook } from "./security.js";
import type { SalazarConfig } from "../lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// tsup bundles into flat dist/ — __dirname is dist/, prompts is at repo root
const PROMPTS_DIR = join(__dirname, "../prompts");

export function readPrompt(name: string): string {
  return readFileSync(join(PROMPTS_DIR, name), "utf-8");
}

export type AgentRole = "planner" | "generator" | "evaluator";

export function makeQueryOptions(opts: {
  role: AgentRole;
  config: SalazarConfig;
  cwd?: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
}) {
  ensureRuntimeDirs();
  const model = opts.config.models[opts.role] ?? opts.config.models.default;
  return {
    systemPrompt: readPrompt(`${opts.role}.md`),
    allowedTools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"] as string[],
    permissionMode: "bypassPermissions" as const,
    allowDangerouslySkipPermissions: true,
    model,
    cwd: opts.cwd ?? getOutputDir(),
    maxTurns: opts.maxTurns ?? 1000,
    maxBudgetUsd: opts.maxBudgetUsd ?? 50.0,
    hooks: {
      PreToolUse: [{ matcher: "Bash", hooks: [bashSecurityHook] }],
    },
  };
}
