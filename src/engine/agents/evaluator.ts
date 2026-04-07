/**
 * Evaluator agent — adversarial code reviewer with graded rubrics.
 *
 * Scores a feature implementation on 4 dimensions with a weighted rubric.
 * Minimum 7.0/10 to pass. Critical security issues cause auto-fail regardless
 * of score.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { makeQueryOptions } from "../client.js";
import type { Feature, SalazarConfig, EvalResult, EvaluatorScores } from "../../lib/types.js";

const MIN_PASSING_SCORE = 7.0;

const WEIGHTS: Record<keyof EvaluatorScores, number> = {
  specCompliance: 0.35,
  codeQuality: 0.25,
  security: 0.25,
  usability: 0.15,
};

/**
 * Extract JSON evaluation from evaluator response text.
 * Tries ```json blocks first, then raw JSON object matching.
 */
export function parseEvaluation(text: string): Record<string, unknown> | null {
  // Try to find ```json ... ``` blocks first
  const jsonBlockMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]) as Record<string, unknown>;
    } catch {
      // Fall through to brace scanning
    }
  }

  // Scan character-by-character for matched {...} braces
  let braceDepth = 0;
  let start: number | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (start === null) {
        start = i;
      }
      braceDepth++;
    } else if (ch === "}") {
      braceDepth--;
      if (braceDepth === 0 && start !== null) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>;
        } catch {
          start = null;
        }
      }
    }
  }

  return null;
}

/**
 * Compute weighted score from dimension scores.
 */
export function computeWeightedScore(dimensions: Partial<EvaluatorScores>): number {
  let total = 0;
  for (const [dim, weight] of Object.entries(WEIGHTS)) {
    total += (dimensions[dim as keyof EvaluatorScores] ?? 0) * weight;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Run the evaluator agent to review a feature implementation.
 */
export async function runEvaluator(
  feature: Feature,
  config: SalazarConfig,
  outputDir: string,
): Promise<EvalResult> {
  const featureId = feature.id;
  const description = feature.description;
  const steps = feature.steps ?? [];

  console.log(`[evaluator] Evaluating feature ${featureId}: ${description}`);

  const stepsText =
    steps.length > 0
      ? steps.map((s) => `  - ${s}`).join("\n")
      : "  (no BDD steps defined)";

  const prompt =
    `Evaluate the implementation of feature **${featureId}**: ${description}\n\n` +
    `### BDD Scenario\n${stepsText}\n\n` +
    `Review the code in the current directory. The feature was just implemented. ` +
    `Use \`git diff HEAD~1\` to see what changed. Run tests, check types, and ` +
    `score the implementation using your rubric.\n\n` +
    `Return your evaluation as a JSON object.`;

  const options = makeQueryOptions({
    role: "evaluator",
    config,
    cwd: outputDir,
    maxBudgetUsd: 15.0,
  });

  let responseText = "";
  let costUsd = 0.0;

  try {
    for await (const message of query({ prompt, options })) {
      // Collect text from assistant messages
      if ("content" in message && Array.isArray(message.content)) {
        for (const block of message.content) {
          if (
            block !== null &&
            typeof block === "object" &&
            "type" in block &&
            block.type === "text" &&
            "text" in block &&
            typeof block.text === "string"
          ) {
            responseText += block.text;
          }
        }
      }

      // Extract cost from result message
      if ("result" in message) {
        const result = message as Record<string, unknown>;
        if (typeof result["total_cost_usd"] === "number") {
          costUsd = result["total_cost_usd"];
        } else if (typeof result["cost_usd"] === "number") {
          costUsd = result["cost_usd"];
        }
        console.log(
          `[evaluator] Feature ${featureId} evaluation complete: cost=$${costUsd.toFixed(4)}`
        );
      }
    }
  } catch (err) {
    console.error(`[evaluator] Feature ${featureId} evaluation failed:`, err);
    return {
      score: 0.0,
      passed: false,
      feedback: `Evaluator crashed: ${err}`,
      dimensionScores: {
        specCompliance: 0,
        codeQuality: 0,
        security: 0,
        usability: 0,
      },
      costUsd,
    };
  }

  // Parse the evaluation JSON from the response
  const evaluation = parseEvaluation(responseText);

  if (evaluation === null) {
    console.warn(`[evaluator] Could not parse evaluation JSON from response`);
    return {
      score: 0.0,
      passed: false,
      feedback: `Could not parse evaluator response. Raw text:\n${responseText.slice(0, 1000)}`,
      dimensionScores: {
        specCompliance: 0,
        codeQuality: 0,
        security: 0,
        usability: 0,
      },
      costUsd,
    };
  }

  // Extract and validate dimension scores
  const rawDimensions = (evaluation["dimensionScores"] ?? {}) as Record<string, unknown>;
  const dimensionScores: EvaluatorScores = {
    specCompliance: typeof rawDimensions["specCompliance"] === "number" ? rawDimensions["specCompliance"] : 0,
    codeQuality: typeof rawDimensions["codeQuality"] === "number" ? rawDimensions["codeQuality"] : 0,
    security: typeof rawDimensions["security"] === "number" ? rawDimensions["security"] : 0,
    usability: typeof rawDimensions["usability"] === "number" ? rawDimensions["usability"] : 0,
  };

  const overallScore = computeWeightedScore(dimensionScores);

  const issues = Array.isArray(evaluation["issues"])
    ? (evaluation["issues"] as Array<Record<string, unknown>>)
    : [];

  // Check for automatic failure: critical security issues
  const hasCriticalSecurity = issues.some(
    (issue) => issue["severity"] === "high" && issue["dimension"] === "security"
  );

  const passed = overallScore >= MIN_PASSING_SCORE && !hasCriticalSecurity;

  if (hasCriticalSecurity && overallScore >= MIN_PASSING_SCORE) {
    console.warn(
      `[evaluator] Feature ${featureId} scored ${overallScore} but has critical security issues — auto-fail`
    );
  }

  // Format feedback string with scores, issues, and recommendations
  const feedbackParts: string[] = [
    `Score: ${overallScore}/10 (${passed ? "PASS" : "FAIL"})`,
    `Spec Compliance: ${dimensionScores.specCompliance}/10`,
    `Code Quality: ${dimensionScores.codeQuality}/10`,
    `Security: ${dimensionScores.security}/10`,
    `Usability: ${dimensionScores.usability}/10`,
  ];

  if (issues.length > 0) {
    feedbackParts.push("\nIssues:");
    for (const issue of issues) {
      const sev = typeof issue["severity"] === "string" ? issue["severity"] : "unknown";
      const desc = typeof issue["description"] === "string" ? issue["description"] : "no description";
      const file = typeof issue["file"] === "string" ? issue["file"] : "";
      const line = issue["line"] !== undefined ? String(issue["line"]) : "";
      const loc = file ? ` (${file}:${line})` : "";
      feedbackParts.push(`  [${sev}]${loc} ${desc}`);
    }
  }

  const recommendations = Array.isArray(evaluation["recommendations"])
    ? (evaluation["recommendations"] as unknown[])
    : [];

  if (recommendations.length > 0) {
    feedbackParts.push("\nRecommendations:");
    for (const rec of recommendations) {
      feedbackParts.push(`  - ${rec}`);
    }
  }

  const feedback = feedbackParts.join("\n");

  console.log(`[evaluator] Feature ${featureId}: score=${overallScore}, passed=${passed}`);

  return {
    score: overallScore,
    passed,
    feedback,
    dimensionScores,
    costUsd,
  };
}
