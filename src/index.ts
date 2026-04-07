import meow from "meow";

const cli = meow(`
  Usage
    $ salazar run <spec.md>    Build from a spec (headless)
    $ salazar                  Launch the TUI
    $ salazar config           Configure models
    $ salazar install-skill    Install agent skill for AI coding agents

  Options
    --model              Generator model override
    --model-evaluator    Evaluator model override
    --output-dir         Where to write generated code
    --global             Install skill to ~/.claude/skills/ instead of project-local
`, {
  importMeta: import.meta,
  flags: {
    model: { type: "string" },
    modelEvaluator: { type: "string" },
    outputDir: { type: "string" },
    global: { type: "boolean", default: false },
  },
});

const [command, ...rest] = cli.input;

if (command === "run") {
  const specPath = rest[0];
  if (!specPath) {
    console.error("Usage: salazar run <spec.md>");
    process.exit(1);
  }
  // Import dynamically to avoid loading React for headless mode
  const { Orchestrator } = await import("./engine/orchestrator.js");
  const { loadConfig } = await import("./lib/config.js");
  const { getOutputDir } = await import("./lib/paths.js");

  const config = loadConfig();
  if (cli.flags.model) config.models.generator = cli.flags.model;
  if (cli.flags.modelEvaluator) config.models.evaluator = cli.flags.modelEvaluator;

  const outputDir = cli.flags.outputDir ?? getOutputDir();
  const engine = new Orchestrator(specPath, outputDir, config);

  // Headless mode: log events to console
  engine.on("sessionStart", e => console.log(`[salazar] Session ${e.sessionId}`));
  engine.on("plannerComplete", e => console.log(`[salazar] Planner: ${e.features} features`));
  engine.on("featureStart", e => console.log(`[salazar] Feature ${e.id}: ${e.name} (${e.done}/${e.total})`));
  engine.on("featureComplete", e => console.log(`[salazar] Feature ${e.id} ${e.score != null ? `score ${e.score}` : "PASSED"} (${(e.durationMs / 1000).toFixed(0)}s)`));
  engine.on("validatorResult", e => console.log(`[salazar] Validator ${e.name}: ${e.passed ? "PASS" : "FAIL"}`));
  engine.on("evaluatorResult", e => console.log(`[salazar] Evaluator: ${e.score}/10`));
  engine.on("costUpdate", e => console.log(`[salazar] Cost: $${e.total.toFixed(2)}`));
  engine.on("sessionComplete", e => console.log(`[salazar] Complete: ${e.passing}/${e.totalFeatures} in ${(e.durationMs / 1000).toFixed(0)}s, $${e.cost.toFixed(2)}`));
  engine.on("sessionError", e => { console.error(`[salazar] Error: ${e.error}`); process.exit(1); });

  await engine.run();
} else if (command === "install-skill") {
  const { existsSync, mkdirSync, copyFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { homedir } = await import("node:os");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  // tsup bundles into dist/ at package root, so ../skills/ resolves to <pkg>/skills/
  const bundledSkill = join(__dirname, "../skills/salazar/skill.md");

  if (!existsSync(bundledSkill)) {
    console.error("[salazar] Skill file not found in package. Reinstall salazar.");
    process.exit(1);
  }

  let targetBase: string;

  if (cli.flags.global) {
    // Global install: always use ~/.claude/skills/
    targetBase = join(homedir(), ".claude", "skills");
  } else {
    // Project-local: detect agent framework by checking cwd for config dirs
    const cwd = process.cwd();
    if (existsSync(join(cwd, ".claude"))) {
      targetBase = join(cwd, ".claude", "skills");
    } else if (existsSync(join(cwd, ".codex"))) {
      targetBase = join(cwd, ".codex", "skills");
    } else if (existsSync(join(cwd, ".agent"))) {
      targetBase = join(cwd, ".agent", "skills");
    } else {
      // Default to .claude (most common)
      targetBase = join(cwd, ".claude", "skills");
    }
  }

  const targetDir = join(targetBase, "salazar");
  const targetFile = join(targetDir, "skill.md");

  mkdirSync(targetDir, { recursive: true });
  copyFileSync(bundledSkill, targetFile);

  // Derive a display-friendly relative path
  const cwd = process.cwd();
  const displayPath = targetFile.startsWith(cwd)
    ? targetFile.slice(cwd.length + 1)
    : targetFile.startsWith(homedir())
      ? "~" + targetFile.slice(homedir().length)
      : targetFile;

  console.log(`Installed salazar skill to ${displayPath}`);
  console.log("Agents will now know how to use salazar for autonomous builds.");
} else if (!command || command === "config" || command === "history") {
  // TUI mode
  const React = await import("react");
  const { render } = await import("ink");
  const { App } = await import("./tui/app.js");
  render(React.default.createElement(App, { command: command ?? undefined }));
} else {
  cli.showHelp();
}
