/**
 * Generator agent — implements one feature per session via TDD.
 *
 * Receives a single feature, runs a Claude Code session in the output
 * directory, and returns whether the feature was marked as passing.
 */

import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { makeQueryOptions } from "../client.js";
import { readProgress, formatProgressHeader } from "../progress.js";
import type { Feature, SalazarConfig } from "../../lib/types.js";

export interface GeneratorResult {
  success: boolean;
  costUsd: number;
  error: string | null;
}

export async function runGenerator(
  feature: Feature,
  config: SalazarConfig,
  outputDir: string,
  evaluatorFeedback?: string | null,
): Promise<GeneratorResult> {
  const { id: featureId, description } = feature;

  console.log(`[generator] Starting feature ${featureId}: ${description}`);

  // Build progress header
  const progress = readProgress(outputDir);
  const progressHeader = progress
    ? formatProgressHeader(progress)
    : "No progress file yet.\n";

  // Format BDD steps
  const stepsText =
    feature.steps.length > 0
      ? feature.steps.map((s) => `  - ${s}`).join("\n")
      : "  (no BDD steps defined)";

  const featureListPath = join(outputDir, "feature_list.json");

  // Assemble prompt parts
  const promptParts: string[] = [
    progressHeader,
    `\n## Your Assignment\n\n`,
    `Implement feature **${featureId}**: ${description}\n\n`,
    `### BDD Scenario\n${stepsText}\n\n`,
  ];

  if (evaluatorFeedback) {
    promptParts.push(
      `### Previous Evaluator Feedback (you must address these issues)\n\n` +
        `${evaluatorFeedback}\n\n` +
        `Fix the issues identified above and ensure the feature passes evaluation.\n`,
    );
  }

  promptParts.push(
    `Implement this feature, write tests, verify everything passes. ` +
      `All code should be written in: ${outputDir}\n` +
      `Update the feature list at: ${featureListPath} — set passes to true for feature ${featureId} only.\n` +
      `Do NOT run git commit — the orchestrator handles commits.`,
  );

  const prompt = promptParts.join("");

  // 5-minute timeout via AbortController passed into options
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300_000);

  const options = makeQueryOptions({
    role: "generator",
    config,
    cwd: outputDir,
    maxTurns: 50,
    maxBudgetUsd: 50.0,
  });

  // Inject abort controller into options
  const optionsWithAbort = { ...options, abortController: controller };

  let costUsd = 0.0;
  let error: string | null = null;

  try {
    for await (const message of query({ prompt, options: optionsWithAbort })) {
      const msg = message as Record<string, unknown>;
      if (msg["type"] === "result") {
        if (typeof msg["total_cost_usd"] === "number") {
          costUsd = msg["total_cost_usd"];
        } else if (typeof msg["cost_usd"] === "number") {
          costUsd = msg["cost_usd"];
        }
        console.log(
          `[generator] Feature ${featureId} session complete: cost=$${costUsd.toFixed(4)}, turns=${msg["num_turns"] ?? "?"}`,
        );
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      error = "Generator timed out after 300s";
      console.error(`[generator] Feature ${featureId}: ${error}`);
    } else {
      error = err instanceof Error ? err.message : String(err);
      console.error(`[generator] Feature ${featureId} failed: ${error}`);
    }
  } finally {
    clearTimeout(timeout);
  }

  // Check if the feature was marked as passing in feature_list.json
  const updatedProgress = readProgress(outputDir);
  let success = false;
  if (updatedProgress) {
    for (const f of updatedProgress.items) {
      if (f.id === featureId && f.passes) {
        success = true;
        break;
      }
    }
  }

  console.log(
    `[generator] Feature ${featureId} result: success=${success}, cost=$${costUsd.toFixed(4)}, error=${error ?? "none"}`,
  );

  return { success, costUsd, error };
}
