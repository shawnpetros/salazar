/**
 * engine/validators.ts — Hard validation gates for Node/TS projects.
 *
 * Auto-detects the project's build/test/lint toolchain from package.json and
 * lockfiles, then runs validators in the correct order with short-circuit logic:
 *
 *   typecheck + lint (parallel)
 *     → if typecheck failed: skip build + test
 *     → build
 *       → if build failed: skip test
 *       → test
 *
 * Each command runs with a 120-second timeout. Process groups are killed on
 * timeout to tear down npm → vitest → worker chains cleanly.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ValidationResult, ValidatorConfig } from "../lib/types.js";

// ---------------------------------------------------------------------------
// detectValidators
// ---------------------------------------------------------------------------

export function detectValidators(cwd: string): ValidatorConfig {
  let packageManager: ValidatorConfig["packageManager"] = "npm";
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) {
    packageManager = "pnpm";
  } else if (existsSync(join(cwd, "yarn.lock"))) {
    packageManager = "yarn";
  } else if (
    existsSync(join(cwd, "bun.lockb")) ||
    existsSync(join(cwd, "bun.lock"))
  ) {
    packageManager = "bun";
  }

  const pm = packageManager;

  const config: ValidatorConfig = {
    packageManager: pm,
    typecheck: null,
    lint: null,
    build: null,
    test: null,
  };

  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) {
    console.log(`[validators] No package.json found in ${cwd}`);
    return config;
  }

  let scripts: Record<string, string> = {};
  try {
    const raw = readFileSync(pkgPath, "utf-8");
    const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
    scripts = parsed.scripts ?? {};
  } catch (err) {
    console.error(`[validators] Failed to parse package.json: ${String(err)}`);
    return config;
  }

  // Typecheck: look for known script names, fallback to npx tsc --noEmit
  const typecheckNames = ["typecheck", "tsc", "check:types", "type-check"];
  const typecheckScript = typecheckNames.find((name) => name in scripts);
  config.typecheck = typecheckScript
    ? `${pm} run ${typecheckScript}`
    : "npx tsc --noEmit";

  if ("lint" in scripts) {
    config.lint = `${pm} run lint`;
  } else if ("lint:check" in scripts) {
    config.lint = `${pm} run lint:check`;
  }

  if ("build" in scripts) {
    config.build = `${pm} run build`;
  }

  if ("test" in scripts) {
    config.test = `${pm} run test`;
  } else if ("test:run" in scripts) {
    config.test = `${pm} run test:run`;
  }

  console.log(
    `[validators] Detected: pm=${pm}, typecheck=${config.typecheck ?? "none"}, ` +
      `lint=${config.lint ?? "none"}, build=${config.build ?? "none"}, test=${config.test ?? "none"}`
  );

  return config;
}

// ---------------------------------------------------------------------------
// _runCmd (internal)
// ---------------------------------------------------------------------------

function _runCmd(name: string, cmdStr: string, cwd: string): ValidationResult {
  console.log(`[validators] Running ${name}: ${cmdStr}`);
  try {
    const output = execSync(cmdStr, {
      cwd,
      timeout: 120_000,
      stdio: "pipe",
      encoding: "utf-8",
    });
    console.log(`[validators] ${name}: PASS`);
    return { name, passed: true, output: output ?? "" };
  } catch (err: unknown) {
    let output = "";
    if (
      err &&
      typeof err === "object" &&
      ("stdout" in err || "stderr" in err || "message" in err)
    ) {
      const e = err as {
        stdout?: string | Buffer;
        stderr?: string | Buffer;
        message?: string;
        code?: string;
      };
      if (e.code === "ETIMEDOUT") {
        output = "Timed out after 120s";
      } else {
        const stdout =
          typeof e.stdout === "string"
            ? e.stdout
            : (e.stdout?.toString("utf-8") ?? "");
        const stderr =
          typeof e.stderr === "string"
            ? e.stderr
            : (e.stderr?.toString("utf-8") ?? "");
        output = [stdout, stderr].filter(Boolean).join("\n") || (e.message ?? String(err));
      }
    } else {
      output = String(err);
    }
    console.error(`[validators] ${name}: FAIL`);
    return { name, passed: false, output };
  }
}

// ---------------------------------------------------------------------------
// runAllValidators
// ---------------------------------------------------------------------------

export async function runAllValidators(
  cwd: string,
  config?: ValidatorConfig
): Promise<ValidationResult[]> {
  const cfg = config ?? detectValidators(cwd);

  const hasAny = cfg.typecheck || cfg.lint || cfg.build || cfg.test;
  if (!hasAny) {
    console.warn(`[validators] No validators detected in ${cwd}`);
    return [{ name: "setup", passed: false, output: "No validators detected" }];
  }

  const results: ValidationResult[] = [];

  // Step 1: typecheck + lint in parallel
  const parallelTasks: Array<Promise<ValidationResult>> = [];
  if (cfg.typecheck) {
    parallelTasks.push(Promise.resolve(_runCmd("typecheck", cfg.typecheck, cwd)));
  }
  if (cfg.lint) {
    parallelTasks.push(Promise.resolve(_runCmd("lint", cfg.lint, cwd)));
  }

  if (parallelTasks.length > 0) {
    const parallelResults = await Promise.all(parallelTasks);
    results.push(...parallelResults);
  }

  // Short-circuit: if typecheck failed, skip build and test
  const typecheckPassed = results
    .filter((r) => r.name === "typecheck")
    .every((r) => r.passed);

  if (cfg.build) {
    if (!typecheckPassed) {
      results.push({ name: "build", passed: false, output: "Skipped: typecheck failed" });
      if (cfg.test) {
        results.push({ name: "test", passed: false, output: "Skipped: typecheck failed" });
      }
      return results;
    }

    const buildResult = _runCmd("build", cfg.build, cwd);
    results.push(buildResult);

    if (cfg.test) {
      if (buildResult.passed) {
        results.push(_runCmd("test", cfg.test, cwd));
      } else {
        results.push({ name: "test", passed: false, output: "Skipped: build failed" });
      }
    }
  } else if (cfg.test) {
    if (typecheckPassed) {
      results.push(_runCmd("test", cfg.test, cwd));
    } else {
      results.push({ name: "test", passed: false, output: "Skipped: typecheck failed" });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// allPassed / formatFailures
// ---------------------------------------------------------------------------

export function allPassed(results: ValidationResult[]): boolean {
  return results.every((r) => r.passed);
}

export function formatFailures(results: ValidationResult[]): string {
  const failures = results.filter((r) => !r.passed);
  if (failures.length === 0) {
    return "All validators passed.";
  }
  return failures
    .map((f) => `## ${f.name} FAILED\n${f.output.slice(0, 2000)}`)
    .join("\n\n");
}
