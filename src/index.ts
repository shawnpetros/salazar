#!/usr/bin/env node
import meow from "meow";

const cli = meow(`
  Usage
    $ salazar run <spec.md>    Build from a spec (headless)
    $ salazar                  Launch the TUI
    $ salazar config           Configure models

  Options
    --model              Generator model override
    --model-evaluator    Evaluator model override
    --output-dir         Where to write generated code
`, {
  importMeta: import.meta,
  flags: {
    model: { type: "string" },
    modelEvaluator: { type: "string" },
    outputDir: { type: "string" },
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
} else if (!command || command === "config") {
  // TUI mode
  const React = await import("react");
  const { render } = await import("ink");
  const { App } = await import("./tui/app.js");
  render(React.default.createElement(App, { command: command ?? undefined }));
} else {
  cli.showHelp();
}
