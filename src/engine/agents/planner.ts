/**
 * Planner agent — decomposes app_spec.md into feature_list.json.
 *
 * One-shot Claude Code session that reads a product spec and writes
 * feature_list.json to the output directory.
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { makeQueryOptions } from "../client.js";
import type { SalazarConfig } from "../../lib/types.js";

export interface PlannerResult {
  success: boolean;
  costUsd: number;
}

export async function runPlanner(
  specPath: string,
  outputDir: string,
  config: SalazarConfig
): Promise<PlannerResult> {
  console.log("[planner] Starting planner agent");

  const specText = readFileSync(specPath, "utf-8");
  mkdirSync(outputDir, { recursive: true });
  const destSpecPath = join(outputDir, "app_spec.md");
  copyFileSync(specPath, destSpecPath);
  console.log(`[planner] Copied spec to ${destSpecPath}`);

  const featureListPath = join(outputDir, "feature_list.json");

  const prompt =
    `Here is the product specification. Decompose it into a comprehensive ` +
    `feature list with BDD scenarios.\n\n` +
    `IMPORTANT: Write the output to this exact absolute path: ${featureListPath}\n` +
    `Also read the spec from: ${destSpecPath}\n\n` +
    `---\n\n${specText}`;

  const options = makeQueryOptions({
    role: "planner",
    config,
    cwd: outputDir,
    maxTurns: 50,
    maxBudgetUsd: 10.0,
  });

  let costUsd = 0;

  try {
    for await (const message of query({ prompt, options })) {
      if ("result" in message) {
        // Session completed — result message
        // Cost may be available on the message depending on SDK version;
        // cast to any to probe without hard-coding a potentially-wrong type.
        const result = message as Record<string, unknown>;
        if (typeof result["total_cost_usd"] === "number") {
          costUsd = result["total_cost_usd"];
        } else if (typeof result["cost_usd"] === "number") {
          costUsd = result["cost_usd"];
        }
        console.log(`[planner] Session complete: cost=$${costUsd.toFixed(4)}`);
      }
    }
  } catch (err) {
    console.error("[planner] Session error:", err);
    return { success: false, costUsd };
  }

  // Verify output
  if (existsSync(featureListPath)) {
    const { statSync } = await import("node:fs");
    const size = statSync(featureListPath).size;
    console.log(`[planner] Created feature_list.json (${size} bytes)`);
    return { success: true, costUsd };
  } else {
    console.error("[planner] feature_list.json was not created");
    return { success: false, costUsd };
  }
}
