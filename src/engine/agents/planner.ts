/**
 * Planner agent — decomposes app_spec.md into feature_list.json.
 *
 * One-shot Claude Code session that reads a product spec and writes
 * feature_list.json to the output directory. Output is validated against
 * the FeatureList contract schema — if invalid, the planner retries.
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { makeQueryOptions } from "../client.js";
import { FeatureListLooseSchema, validateHandoff } from "../contracts.js";
import type { SalazarConfig } from "../../lib/types.js";

const MAX_PLAN_RETRIES = 2;

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
  let totalCost = 0;

  for (let attempt = 0; attempt <= MAX_PLAN_RETRIES; attempt++) {
    const retryContext = attempt > 0
      ? `\n\nPREVIOUS ATTEMPT FAILED: The feature_list.json you created did not match the required schema. ` +
        `Ensure the file is valid JSON with a "features" array where each feature has: ` +
        `id (string), description (string), complexity ("setup"|"simple"|"moderate"|"complex"), ` +
        `steps (string array), passes (boolean, always false initially).`
      : "";

    const prompt =
      `Here is the product specification. Decompose it into a comprehensive ` +
      `feature list with BDD scenarios.\n\n` +
      `IMPORTANT: Write the output to this exact absolute path: ${featureListPath}\n` +
      `Also read the spec from: ${destSpecPath}\n\n` +
      `---\n\n${specText}${retryContext}`;

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
          const result = message as Record<string, unknown>;
          if (typeof result["total_cost_usd"] === "number") costUsd = result["total_cost_usd"];
          else if (typeof result["cost_usd"] === "number") costUsd = result["cost_usd"];
          console.log(`[planner] Session complete (attempt ${attempt + 1}): cost=$${costUsd.toFixed(4)}`);
        }
      }
    } catch (err) {
      console.error("[planner] Session error:", err);
      totalCost += costUsd;
      continue;
    }

    totalCost += costUsd;

    // Gate: validate the output against the contract
    if (!existsSync(featureListPath)) {
      console.warn(`[planner] Attempt ${attempt + 1}: feature_list.json was not created`);
      continue;
    }

    try {
      const raw = JSON.parse(readFileSync(featureListPath, "utf-8"));
      const handoff = validateHandoff(FeatureListLooseSchema, raw);

      if (!handoff.valid) {
        console.warn(`[planner] Attempt ${attempt + 1}: schema validation failed:\n${handoff.error}`);
        // Delete invalid file so next attempt starts clean
        const { unlinkSync } = await import("node:fs");
        unlinkSync(featureListPath);
        continue;
      }

      // Contract satisfied — normalize to { features: [...] } format
      const normalized = handoff.data;
      writeFileSync(featureListPath, JSON.stringify(normalized, null, 2));

      const featureCount = normalized.features.length;
      console.log(`[planner] Created feature_list.json (${featureCount} features, validated)`);
      return { success: true, costUsd: totalCost };

    } catch (err) {
      console.warn(`[planner] Attempt ${attempt + 1}: failed to parse feature_list.json: ${err}`);
      continue;
    }
  }

  console.error(`[planner] All ${MAX_PLAN_RETRIES + 1} attempts failed`);
  return { success: false, costUsd: totalCost };
}
