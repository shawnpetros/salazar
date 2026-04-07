/**
 * Completion screen component — shown when a harness session finishes.
 *
 * Renders a summary of the completed session including:
 *  - Number of features passed out of total
 *  - Total session cost in USD
 *  - Output directory path
 *  - Optional dashboard URL (omitted when not configured)
 *  - A 'Press Enter to exit' prompt
 *
 * Pressing Enter invokes the `onDone` callback so the parent can cleanly
 * terminate the process.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { Completion } from './components/completion.js';
 *
 * render(
 *   <Completion
 *     event={{ type: 'session_complete', passing: 38, totalFeatures: 38, durationMs: 60000, cost: 9.27 }}
 *     outputDir="/tmp/harness-output"
 *     dashboardUrl="http://localhost:3000"
 *     onDone={() => process.exit(0)}
 *   />
 * );
 * ```
 */

import React from "react";
import { Box, Text, useInput } from "ink";
import type { SessionCompleteEvent } from "../../lib/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props accepted by the {@link Completion} component. */
export interface CompletionProps {
  /**
   * The session_complete event emitted by the orchestrator when the run ends.
   * Contains totals for features passed, cost, and duration.
   */
  event: SessionCompleteEvent;

  /**
   * Absolute path to the directory where harness output was written.
   * Always displayed on the completion screen.
   */
  outputDir: string;

  /**
   * Optional URL of the dashboard server.
   * When provided, the URL is displayed as an additional info line.
   * Omitted entirely when undefined or empty.
   */
  dashboardUrl?: string;

  /**
   * Callback invoked when the user presses Enter to exit the completion screen.
   * Typically calls `process.exit(0)`.
   */
  onDone: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a USD cost value as a dollar string with two decimal places.
 *
 * @param cost - Cost in USD.
 * @returns Formatted string, e.g. `'$9.27'`.
 *
 * @example
 * ```ts
 * formatCost(9.27);  // '$9.27'
 * formatCost(0.1);   // '$0.10'
 * ```
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Completion screen for the harness CLI.
 *
 * Displayed when a harness session finishes (either success or after all
 * features have been attempted). Shows a green summary of pass count, cost,
 * output directory, an optional dashboard link, and an Enter-to-exit prompt.
 *
 * @param props - {@link CompletionProps}
 * @returns A React element containing the completion layout.
 */
export function Completion({
  event,
  outputDir,
  dashboardUrl,
  onDone,
}: CompletionProps): React.ReactElement {
  useInput((_input, key) => {
    if (key.return) {
      onDone();
    }
  });

  return (
    <Box flexDirection="column" paddingTop={1} paddingBottom={1}>
      <Text color="green" bold>
        {"✓ Session complete"}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="green">
          {`✓ ${event.passing}/${event.totalFeatures} features passed`}
        </Text>
        <Text color="green">
          {`✓ ${formatCost(event.cost)} total cost`}
        </Text>
        <Text>{`Output: ${outputDir}`}</Text>
        {dashboardUrl !== undefined && dashboardUrl !== "" && (
          <Text>{`Dashboard: ${dashboardUrl}`}</Text>
        )}
      </Box>
      <Box marginTop={2}>
        <Text color="cyan">{"Press Enter to exit"}</Text>
      </Box>
    </Box>
  );
}
