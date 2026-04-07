/**
 * Orchestrator core loop — wires planner → generator → evaluator.
 *
 * Greenfield path only. Decomposes a spec into features via the planner,
 * then iterates: generator (TDD) → validators → evaluator → retry.
 *
 * Ported from salazar/salazar/orchestrator.py (HarnessSession + run_orchestrator
 * + _run_feature_loop), greenfield logic only.
 */

import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import { join } from "node:path";
import { TypedEmitter } from "../lib/events.js";
import { runPlanner } from "./agents/planner.js";
import { runGenerator } from "./agents/generator.js";
import { runEvaluator } from "./agents/evaluator.js";
import { readProgress, nextIncomplete } from "./progress.js";
import {
  detectValidators,
  runAllValidators,
  allPassed,
  formatFailures,
} from "./validators.js";
import { getDb } from "./storage.js";
import type { SalazarConfig, Feature } from "../lib/types.js";

const MAX_VALIDATOR_RETRIES = 3;
const MAX_EVALUATOR_RETRIES = 2;
const DELAY_BETWEEN_FEATURES_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Orchestrator extends TypedEmitter {
  private sessionId: string;
  private totalCost = 0;
  private costByAgent = { planner: 0, generator: 0, evaluator: 0 };
  private iteration = 0;
  private startTime = Date.now();

  constructor(
    private specPath: string,
    private outputDir: string,
    private config: SalazarConfig,
  ) {
    super();
    this.sessionId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }

  // ---------------------------------------------------------------------------
  // run() — top-level entry point
  // ---------------------------------------------------------------------------

  async run(): Promise<void> {
    console.log(`[orchestrator] Starting session ${this.sessionId}`);

    this.emit("sessionStart", {
      type: "session_start",
      sessionId: this.sessionId,
      spec: this.specPath,
    });

    // Ensure output directory is a git repo for per-feature commits
    this.ensureGitRepo();

    // Extract spec name and description from spec file
    const specStem = basename(this.specPath).replace(/\.[^.]+$/, "");
    let specName = specStem;
    let specDescription = "";

    try {
      const specText = readFileSync(this.specPath, "utf-8");
      const specLines = specText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (specLines.length > 0) {
        specName = specLines[0].replace(/^#+\s*/, "");
      }
      // First non-heading, non-separator line
      specDescription =
        specLines
          .slice(1)
          .find((l) => !l.startsWith("#") && !l.startsWith("---")) ?? "";
      specDescription = specDescription.slice(0, 200);
    } catch (err) {
      console.warn(
        `[orchestrator] Could not read spec file for metadata: ${err}`,
      );
    }

    // Write session to SQLite
    const db = getDb();
    db.createSession(this.sessionId, {
      specName,
      specDescription: specDescription.slice(0, 500),
      mode: "greenfield",
      modelGenerator: this.config.models.generator,
      modelEvaluator: this.config.models.evaluator,
    });

    try {
      // Phase 1: Planning
      // Check if feature_list.json already exists (resume support)
      const featureListPath = join(this.outputDir, "feature_list.json");
      const hasFeatures = existsSync(featureListPath);

      if (!hasFeatures) {
        console.log(
          "[orchestrator] No feature_list.json — running planner",
        );

        const plannerStart = Date.now();
        const plannerResult = await runPlanner(this.specPath, this.outputDir, this.config);
        const plannerMs = Date.now() - plannerStart;

        this.costByAgent.planner += plannerResult.costUsd;
        this.totalCost += plannerResult.costUsd;

        if (!plannerResult.success) {
          console.error("[orchestrator] Planner failed — aborting");
          this.emit("sessionError", {
            type: "session_error",
            error: "Planner failed to create feature_list.json",
          });
          db.updateSessionState(this.sessionId, "error", "plan");
          return;
        }

        // Read progress after planner
        const progress = readProgress(this.outputDir);
        if (progress) {
          console.log(
            `[orchestrator] Planner created ${progress.total} features`,
          );

          this.emit("plannerComplete", {
            type: "planner_complete",
            features: progress.total,
            durationMs: plannerMs,
          });

          // Write features to SQLite
          db.bulkInsertFeatures(this.sessionId, progress.items);
          db.addTimelineEvent(
            this.sessionId,
            `Planner: ${progress.total} features`,
            plannerMs,
          );
        }
      } else {
        console.log(
          "[orchestrator] Resuming — feature_list.json already exists",
        );
        const progress = readProgress(this.outputDir);
        if (progress) {
          this.emit("plannerComplete", {
            type: "planner_complete",
            features: progress.total,
            durationMs: 0,
          });
        }
      }

      // Phase 2: Build loop
      await this.featureLoop();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[orchestrator] Fatal error: ${errorMsg}`);
      this.emit("sessionError", {
        type: "session_error",
        error: errorMsg,
      });
      db.updateSessionState(this.sessionId, "error");
    } finally {
      const elapsed = Math.round((Date.now() - this.startTime) / 1000);
      console.log(
        `[orchestrator] Session ${this.sessionId} finished in ${elapsed}s, ` +
          `total cost: $${this.totalCost.toFixed(2)}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // featureLoop() — the heart of the orchestrator
  // ---------------------------------------------------------------------------

  private async featureLoop(): Promise<void> {
    const db = getDb();

    while (true) {
      // Read current progress
      const progress = readProgress(this.outputDir);
      if (progress === null) {
        console.error("[orchestrator] Cannot read feature_list.json");
        this.emit("sessionError", {
          type: "session_error",
          error: "Cannot read feature_list.json",
        });
        return;
      }

      // Check if all features are complete
      if (progress.isComplete) {
        console.log(
          `[orchestrator] All ${progress.total} features complete!`,
        );
        this.emit("sessionComplete", {
          type: "session_complete",
          totalFeatures: progress.total,
          passing: progress.passing,
          durationMs: Date.now() - this.startTime,
          cost: this.totalCost,
        });
        db.updateSessionState(this.sessionId, "complete", "done");
        return;
      }

      // Get next incomplete feature
      const feature = nextIncomplete(progress);
      if (feature === null) {
        console.log("[orchestrator] No more incomplete features — done");
        this.emit("sessionComplete", {
          type: "session_complete",
          totalFeatures: progress.total,
          passing: progress.passing,
          durationMs: Date.now() - this.startTime,
          cost: this.totalCost,
        });
        db.updateSessionState(this.sessionId, "complete", "done");
        return;
      }

      this.iteration++;
      const featureStartTime = Date.now();

      console.log(
        `[orchestrator] Iteration ${this.iteration}: ` +
          `feature ${feature.id} (${progress.passing}/${progress.total} done)`,
      );

      this.emit("featureStart", {
        type: "feature_start",
        id: feature.id,
        iteration: this.iteration,
        done: progress.passing,
        total: progress.total,
        name: feature.description,
      });

      // Determine complexity tier
      const complexity = feature.complexity ?? "moderate";
      const skipEvaluator =
        complexity === "setup" || complexity === "simple";
      const maxEvalRetries = skipEvaluator ? 0 : MAX_EVALUATOR_RETRIES;

      if (skipEvaluator) {
        console.log(
          `[orchestrator] Feature ${feature.id} is ${complexity} — skipping evaluator`,
        );
      }

      // Generator loop with validator + evaluator retries
      let evaluatorFeedback: string | null = null;
      let featureComplete = false;

      for (
        let evalAttempt = 0;
        evalAttempt <= maxEvalRetries;
        evalAttempt++
      ) {
        // --- Run generator ---
        const genResult = await runGenerator(
          feature,
          this.config,
          this.outputDir,
          evaluatorFeedback,
        );
        this.totalCost += genResult.costUsd;
        this.costByAgent.generator += genResult.costUsd;

        if (genResult.error) {
          console.error(
            `[orchestrator] Generator error: ${genResult.error}`,
          );
          break;
        }

        // --- Run validators with retries ---
        // Re-detect validators each iteration (first feature may create package.json)
        const validatorConfig = detectValidators(this.outputDir);

        let validatorPassed = false;

        for (
          let valAttempt = 0;
          valAttempt < MAX_VALIDATOR_RETRIES;
          valAttempt++
        ) {
          const results = await runAllValidators(
            this.outputDir,
            validatorConfig,
          );

          // Emit validator results
          for (const r of results) {
            this.emit("validatorResult", {
              type: "validator_result",
              name: r.name,
              passed: r.passed,
            });
          }

          if (allPassed(results)) {
            validatorPassed = true;
            break;
          }

          console.warn(
            `[orchestrator] Validators failed (attempt ${valAttempt + 1}/${MAX_VALIDATOR_RETRIES})`,
          );

          // If more retries left, re-run generator with failure feedback
          if (valAttempt < MAX_VALIDATOR_RETRIES - 1) {
            evaluatorFeedback = `VALIDATOR FAILURES:\n${formatFailures(results)}`;

            const retryGenResult = await runGenerator(
              feature,
              this.config,
              this.outputDir,
              evaluatorFeedback,
            );
            this.totalCost += retryGenResult.costUsd;
            this.costByAgent.generator += retryGenResult.costUsd;
          }
        }

        if (!validatorPassed) {
          console.error(
            `[orchestrator] Feature ${feature.id}: validators failed after ${MAX_VALIDATOR_RETRIES} attempts`,
          );
          break;
        }

        // --- Skip evaluator for setup/simple features ---
        if (skipEvaluator) {
          const featureElapsedMs = Date.now() - featureStartTime;
          console.log(
            `[orchestrator] Feature ${feature.id} PASSED (validators only, ${complexity})`,
          );
          featureComplete = true;

          this.gitCommitFeature(feature.id, feature.description);

          this.emit("featureComplete", {
            type: "feature_complete",
            id: feature.id,
            score: null,
            durationMs: featureElapsedMs,
            complexity,
          });

          db.upsertFeature(this.sessionId, feature.id, {
            description: feature.description,
            complexity,
            passes: true,
            durationMs: featureElapsedMs,
          });

          db.addTimelineEvent(
            this.sessionId,
            `${feature.id} passed (validators, ${complexity})`,
            featureElapsedMs,
          );

          break;
        }

        // --- Run evaluator for moderate/complex features ---
        const evalResult = await runEvaluator(
          feature,
          this.config,
          this.outputDir,
        );
        this.totalCost += evalResult.costUsd;
        this.costByAgent.evaluator += evalResult.costUsd;

        this.emit("evaluatorResult", {
          type: "evaluator_result",
          score: evalResult.score,
          dimensions: evalResult.dimensionScores as unknown as Record<
            string,
            number
          >,
          feedback: evalResult.feedback,
        });

        if (evalResult.passed) {
          const featureElapsedMs = Date.now() - featureStartTime;
          console.log(
            `[orchestrator] Feature ${feature.id} PASSED (score: ${evalResult.score})`,
          );
          featureComplete = true;

          this.gitCommitFeature(feature.id, feature.description);

          this.emit("featureComplete", {
            type: "feature_complete",
            id: feature.id,
            score: evalResult.score,
            durationMs: featureElapsedMs,
            complexity,
          });

          db.upsertFeature(this.sessionId, feature.id, {
            description: feature.description,
            complexity,
            passes: true,
            durationMs: featureElapsedMs,
            evaluatorScore: evalResult.score,
            evaluatorFeedback: evalResult.feedback,
          });

          db.addTimelineEvent(
            this.sessionId,
            `${feature.id} passed (${evalResult.score}/10)`,
            featureElapsedMs,
          );

          break;
        } else {
          console.warn(
            `[orchestrator] Feature ${feature.id} FAILED evaluation ` +
              `(score: ${evalResult.score}, attempt ${evalAttempt + 1}/${maxEvalRetries + 1})`,
          );
          evaluatorFeedback = evalResult.feedback;
        }
      }

      // --- Cost update ---
      this.emit("costUpdate", {
        type: "cost_update",
        total: this.totalCost,
        byAgent: { ...this.costByAgent },
      });

      db.updateSessionCost(
        this.sessionId,
        this.totalCost,
        this.costByAgent.planner,
        this.costByAgent.generator,
        this.costByAgent.evaluator,
      );

      // --- Handle failure: rollback uncommitted changes ---
      if (!featureComplete) {
        console.error(
          `[orchestrator] Feature ${feature.id} FAILED after all retries`,
        );
        this.gitRollback();

        db.addTimelineEvent(
          this.sessionId,
          `${feature.id} FAILED — rolled back`,
        );

        // In greenfield mode, continue to next feature (don't stop on failure)
      }

      // Brief delay between features to prevent API rate limiting
      await delay(DELAY_BETWEEN_FEATURES_MS);
    }
  }

  // ---------------------------------------------------------------------------
  // Git helpers
  // ---------------------------------------------------------------------------

  private ensureGitRepo(): void {
    const gitDir = join(this.outputDir, ".git");
    if (!existsSync(gitDir)) {
      try {
        mkdirSync(this.outputDir, { recursive: true });
        execSync("git init", { cwd: this.outputDir, timeout: 10000, stdio: "pipe" });
        execSync('git commit --allow-empty -m "init: salazar output directory"', {
          cwd: this.outputDir, timeout: 10000, stdio: "pipe",
        });
        console.log(`[orchestrator] Initialized git repo in ${this.outputDir}`);
      } catch (err) {
        console.warn(`[orchestrator] Could not init git repo: ${err}`);
      }
    }
  }

  private gitCommitFeature(
    featureId: string,
    description: string,
  ): boolean {
    try {
      execSync("git add -A", { cwd: this.outputDir, timeout: 10000, stdio: "pipe" });
      const msg = `feat(${featureId}): ${description}`;
      execSync(
        `git -c user.name="Salazar" -c user.email="salazar@localhost" commit -m "${msg}"`,
        { cwd: this.outputDir, timeout: 10000, stdio: "pipe" },
      );
      console.log(`[orchestrator] Committed: ${msg}`);
      return true;
    } catch {
      console.warn(`[orchestrator] Git commit failed for ${featureId}`);
      return false;
    }
  }

  private gitRollback(): void {
    try {
      execSync("git checkout .", { cwd: this.outputDir, timeout: 10000, stdio: "pipe" });
      console.log("[orchestrator] Rolled back uncommitted changes");
    } catch {
      console.warn("[orchestrator] Rollback failed");
    }
  }
}
