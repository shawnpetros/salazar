#!/usr/bin/env node
/**
 * harness-cli entry point.
 *
 * Parses CLI arguments via meow and routes to the appropriate command handler.
 *
 * Usage:
 *   harness run <spec.md>     — start a harness run with the given spec
 *   harness config            — open the interactive configuration UI
 *   harness history           — browse past session history
 */

import meow from "meow";
import { runCommand } from "./commands/run.js";
import { configCommand, configSetModelCommand, configSetDashboardUrlCommand, configSetDashboardSecretCommand } from "./commands/config.js";
import { historyCommand, historyDetailCommand } from "./commands/history.js";

/** CLI help text shown when --help is passed or no command is provided. */
const helpText = `
  Usage
    $ harness <command> [options]

  Commands
    run <spec>    Run the harness against a feature spec file
    config        Open the interactive configuration editor
    history       Browse past harness session history

  Options
    --help              Show this help message
    --version           Show the CLI version
    --model             Model to use for the generator agent
    --model-evaluator   Model to use for the evaluator agent
    --dashboard-url     URL of the harness dashboard
    --multi             Run multiple features in parallel
    --single            Run a single feature (default mode)

  Examples
    $ harness run app_spec.md
    $ harness run app_spec.md --model claude-opus-4-6 --multi
    $ harness config
    $ harness history
`;

/**
 * Parse CLI arguments and return the meow result.
 * Exported for unit testing without executing side effects.
 *
 * @param argv - Raw argument vector (defaults to process.argv.slice(2)).
 * @returns The meow parsed CLI result.
 */
export function parseCli(argv?: readonly string[]) {
  return meow(helpText, {
    // Only pass argv when explicitly provided; otherwise meow reads process.argv
    ...(argv !== undefined ? { argv } : {}),
    importMeta: import.meta,
    allowUnknownFlags: false,
    flags: {
      /** Model to use for the generator agent (e.g. claude-opus-4-6). */
      model: {
        type: "string",
      },
      /** Model to use for the evaluator agent. */
      modelEvaluator: {
        type: "string",
      },
      /** URL of the harness dashboard. */
      dashboardUrl: {
        type: "string",
      },
      /** Run multiple features in parallel. Mutually exclusive with --single. */
      multi: {
        type: "boolean",
        default: false,
      },
      /** Run a single feature (default mode). Mutually exclusive with --multi. */
      single: {
        type: "boolean",
        default: false,
      },
    },
  });
}

/**
 * Route a parsed CLI result to the appropriate command handler.
 *
 * @param cli - The meow parsed CLI result.
 */
export async function routeCommand(
  cli: ReturnType<typeof parseCli>
): Promise<void> {
  const [command, ...rest] = cli.input;

  switch (command) {
    case "run": {
      const specPath = rest[0];
      if (!specPath) {
        console.error("Error: run command requires a spec file path.");
        console.error("Usage: harness run <spec.md>");
        process.exit(1);
      }
      await runCommand(specPath);
      break;
    }

    case "config": {
      // Handle `config set model <value>` subcommand
      if (rest[0] === "set" && rest[1] === "model") {
        const modelName = rest[2];
        if (!modelName) {
          console.error("Error: config set model requires a model name.");
          console.error("Usage: harness config set model <model-name>");
          process.exit(1);
        }
        configSetModelCommand(modelName);
      } else if (rest[0] === "set" && rest[1] === "dashboard-url") {
        const url = rest[2];
        if (!url) {
          console.error("Error: config set dashboard-url requires a URL.");
          console.error("Usage: harness config set dashboard-url <url>");
          process.exit(1);
        }
        configSetDashboardUrlCommand(url);
      } else if (rest[0] === "set" && rest[1] === "dashboard-secret") {
        const secret = rest[2];
        if (!secret) {
          console.error("Error: config set dashboard-secret requires a secret.");
          console.error("Usage: harness config set dashboard-secret <secret>");
          process.exit(1);
        }
        configSetDashboardSecretCommand(secret);
      } else {
        await configCommand();
      }
      break;
    }

    case "history": {
      const sessionId = rest[0];
      if (sessionId) {
        // Show detail view for the specific session ID
        historyDetailCommand(sessionId);
      } else {
        // Show the full session list
        historyCommand();
      }
      break;
    }

    default: {
      if (command) {
        console.error(`Unknown command: ${command}`);
      }
      cli.showHelp();
      process.exit(1);
    }
  }
}

// Only execute when this module is the entry point (not when imported in tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = parseCli();
  await routeCommand(cli);
}
