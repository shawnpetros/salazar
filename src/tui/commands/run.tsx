/**
 * run command handler.
 *
 * Invoked when the user runs `salazar run <spec>`.
 * Receives the path to the feature spec and starts an engine session.
 */

import { existsSync } from "node:fs";
import React from "react";
import { render } from "ink";
import { RunDashboard } from "../components/run-dashboard.js";

/**
 * Execute the `run` command with the given spec file path.
 *
 * Validates that the spec file exists on disk before rendering the
 * RunDashboard. The engine loads config internally.
 *
 * @param specPath - Path to the feature spec markdown file to run.
 * @param outputDir - Optional output directory override.
 */
export async function runCommand(
  specPath: string,
  outputDir?: string,
): Promise<void> {
  if (!existsSync(specPath)) {
    console.error(`Error: spec file not found: ${specPath}`);
    process.exit(1);
    return;
  }

  console.log(`[salazar] run command received: ${specPath}`);

  render(
    React.createElement(RunDashboard, { specPath, outputDir }),
    { patchConsole: false },
  );
}
