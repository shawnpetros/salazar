import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { toJSONSchema } from "zod";
import type { z } from "zod";
import { getOutputDir, ensureRuntimeDirs } from "../lib/paths.js";
import { bashSecurityHook } from "./security.js";
import type { SalazarConfig } from "../lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// tsup bundles into a flat dist/ at package root. __dirname is <pkg>/dist/,
// so ../prompts resolves to <pkg>/prompts/ — correct for both local dev and
// global npm installs (prompts/ is included in the package "files" list).
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
  // When provided, the SDK will constrain the agent's final response to valid
  // JSON matching this schema — eliminates regex-based JSON extraction.
  outputSchema?: z.ZodTypeAny;
}) {
  ensureRuntimeDirs();
  const model = opts.config.models[opts.role] ?? opts.config.models.default;

  const outputFormat = opts.outputSchema
    ? {
        type: "json_schema" as const,
        schema: toJSONSchema(opts.outputSchema) as Record<string, unknown>,
      }
    : undefined;

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
    ...(outputFormat ? { outputFormat } : {}),
  };
}
