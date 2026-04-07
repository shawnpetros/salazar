/**
 * Evaluator agent — adversarial code reviewer with graded rubrics.
 *
 * Scores a feature implementation on 4 dimensions with a weighted rubric.
 * Minimum 7.0/10 to pass. Critical security issues cause auto-fail.
 *
 * Uses Zod schema validation to gate the evaluator's output — if the
 * evaluation JSON doesn't match the contract, the evaluator retries
 * internally (up to MAX_PARSE_RETRIES) before returning to the orchestrator.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { makeQueryOptions } from "../client.js";
import { EvalOutputSchema, validateHandoff } from "../contracts.js";
import type { EvalOutput } from "../contracts.js";
import type { Feature, SalazarConfig, EvalResult, EvaluatorScores } from "../../lib/types.js";

const MIN_PASSING_SCORE = 7.0;
const MAX_PARSE_RETRIES = 2;

const WEIGHTS: Record<keyof EvaluatorScores, number> = {
  specCompliance: 0.35,
  codeQuality: 0.25,
  security: 0.25,
  usability: 0.15,
};

// ---------------------------------------------------------------------------
// JSON extraction (unchanged — still needed as first-pass parser)
// ---------------------------------------------------------------------------

export function parseEvaluation(text: string): Record<string, unknown> | null {
  const jsonBlockMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]) as Record<string, unknown>;
    } catch { /* fall through */ }
  }

  let braceDepth = 0;
  let start: number | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (start === null) start = i;
      braceDepth++;
    } else if (ch === "}") {
      braceDepth--;
      if (braceDepth === 0 && start !== null) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>;
        } catch { start = null; }
      }
    }
  }
  return null;
}

export function computeWeightedScore(dimensions: Partial<EvaluatorScores>): number {
  let total = 0;
  for (const [dim, weight] of Object.entries(WEIGHTS)) {
    total += (dimensions[dim as keyof EvaluatorScores] ?? 0) * weight;
  }
  return Math.round(total * 100) / 100;
}

// ---------------------------------------------------------------------------
// Schema description for retry prompts
// ---------------------------------------------------------------------------

const SCHEMA_DESCRIPTION = `Return a JSON object with exactly this structure:
{
  "dimensionScores": {
    "specCompliance": <number 0-10>,
    "codeQuality": <number 0-10>,
    "security": <number 0-10>,
    "usability": <number 0-10>
  },
  "issues": [{ "severity": "low|medium|high", "description": "..." }],
  "recommendations": ["..."]
}`;

// ---------------------------------------------------------------------------
// Single evaluator session
// ---------------------------------------------------------------------------

async function runEvalSession(
  prompt: string,
  config: SalazarConfig,
  outputDir: string,
): Promise<{ responseText: string; costUsd: number }> {
  const options = makeQueryOptions({
    role: "evaluator",
    config,
    cwd: outputDir,
    maxBudgetUsd: 15.0,
    outputSchema: EvalOutputSchema,
  });

  let responseText = "";
  let costUsd = 0;

  for await (const message of query({ prompt, options })) {
    if ("content" in message && Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block !== null && typeof block === "object" && "type" in block &&
            block.type === "text" && "text" in block && typeof block.text === "string") {
          responseText += block.text;
        }
      }
    }
    if ("result" in message) {
      const result = message as Record<string, unknown>;
      if (typeof result["total_cost_usd"] === "number") costUsd = result["total_cost_usd"];
      else if (typeof result["cost_usd"] === "number") costUsd = result["cost_usd"];
    }
  }

  return { responseText, costUsd };
}

// ---------------------------------------------------------------------------
// runEvaluator — with contract-gated output
// ---------------------------------------------------------------------------

export async function runEvaluator(
  feature: Feature,
  config: SalazarConfig,
  outputDir: string,
): Promise<EvalResult> {
  const featureId = feature.id;
  const description = feature.description;
  const steps = feature.steps ?? [];

  console.log(`[evaluator] Evaluating feature ${featureId}: ${description}`);

  const stepsText = steps.length > 0
    ? steps.map((s) => `  - ${s}`).join("\n")
    : "  (no BDD steps defined)";

  const basePrompt =
    `Evaluate the implementation of feature **${featureId}**: ${description}\n\n` +
    `### BDD Scenario\n${stepsText}\n\n` +
    `Review the code in the current directory. The feature was just implemented. ` +
    `Use \`git diff HEAD~1\` to see what changed. Run tests, check types, and ` +
    `score the implementation using your rubric.\n\n` +
    SCHEMA_DESCRIPTION;

  let totalCost = 0;

  // Try up to MAX_PARSE_RETRIES + 1 sessions to get valid output
  for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
    const prompt = attempt === 0
      ? basePrompt
      : basePrompt + `\n\nPREVIOUS ATTEMPT FAILED: Your evaluation output could not be parsed. ` +
        `You MUST return a valid JSON object matching the schema above. ` +
        `Do not wrap it in markdown code fences unless you use \`\`\`json.`;

    try {
      const { responseText, costUsd } = await runEvalSession(prompt, config, outputDir);
      totalCost += costUsd;

      console.log(
        `[evaluator] Feature ${featureId} evaluation complete (attempt ${attempt + 1}): cost=$${costUsd.toFixed(4)}`
      );

      // Step 1: Extract JSON from response
      const rawJson = parseEvaluation(responseText);
      if (!rawJson) {
        console.warn(`[evaluator] Attempt ${attempt + 1}: no JSON found in response`);
        continue; // retry
      }

      // Step 2: Validate against contract schema
      const handoff = validateHandoff(EvalOutputSchema, rawJson);
      if (!handoff.valid) {
        console.warn(`[evaluator] Attempt ${attempt + 1}: schema validation failed:\n${handoff.error}`);
        continue; // retry
      }

      // Step 3: Contract satisfied — compute score and build result
      const evalOutput: EvalOutput = handoff.data;
      const overallScore = computeWeightedScore(evalOutput.dimensionScores);

      const hasCriticalSecurity = evalOutput.issues.some(
        (issue) => issue.severity === "high" && issue.dimension === "security"
      );

      const passed = overallScore >= MIN_PASSING_SCORE && !hasCriticalSecurity;

      if (hasCriticalSecurity && overallScore >= MIN_PASSING_SCORE) {
        console.warn(
          `[evaluator] Feature ${featureId} scored ${overallScore} but has critical security issues — auto-fail`
        );
      }

      // Format feedback
      const feedbackParts: string[] = [
        `Score: ${overallScore}/10 (${passed ? "PASS" : "FAIL"})`,
        `Spec Compliance: ${evalOutput.dimensionScores.specCompliance}/10`,
        `Code Quality: ${evalOutput.dimensionScores.codeQuality}/10`,
        `Security: ${evalOutput.dimensionScores.security}/10`,
        `Usability: ${evalOutput.dimensionScores.usability}/10`,
      ];

      if (evalOutput.issues.length > 0) {
        feedbackParts.push("\nIssues:");
        for (const issue of evalOutput.issues) {
          const loc = issue.file ? ` (${issue.file}${issue.line ? `:${issue.line}` : ""})` : "";
          feedbackParts.push(`  [${issue.severity}]${loc} ${issue.description}`);
        }
      }

      if (evalOutput.recommendations.length > 0) {
        feedbackParts.push("\nRecommendations:");
        for (const rec of evalOutput.recommendations) {
          feedbackParts.push(`  - ${rec}`);
        }
      }

      console.log(`[evaluator] Feature ${featureId}: score=${overallScore}, passed=${passed}`);

      return {
        score: overallScore,
        passed,
        feedback: feedbackParts.join("\n"),
        dimensionScores: evalOutput.dimensionScores,
        costUsd: totalCost,
      };

    } catch (err) {
      console.error(`[evaluator] Attempt ${attempt + 1} crashed:`, err);
      totalCost += 0; // session may not have returned cost
    }
  }

  // All attempts exhausted — return structured failure
  console.error(`[evaluator] Feature ${featureId}: all ${MAX_PARSE_RETRIES + 1} attempts failed to produce valid output`);
  return {
    score: 0,
    passed: false,
    feedback: `Evaluator failed to produce valid output after ${MAX_PARSE_RETRIES + 1} attempts`,
    dimensionScores: { specCompliance: 0, codeQuality: 0, security: 0, usability: 0 },
    costUsd: totalCost,
  };
}
