/**
 * Progress bar component — renders a filled/empty bar with a percentage label.
 *
 * Renders a horizontal bar composed of:
 *  - `━` (U+2501) for the filled portion (proportional to `done / total`)
 *  - `░` (U+2591) for the empty remainder
 *  - A percentage label like `38%` at the end
 *
 * @example
 * ```
 * done=8, total=21, width=20  →  ━━━━━━━━░░░░░░░░░░░░  38%
 * done=21, total=21, width=20 →  ━━━━━━━━━━━━━━━━━━━━  100%
 * done=0, total=21, width=20  →  ░░░░░░░░░░░░░░░░░░░░  0%
 * ```
 */

import React from "react";
import { Text } from "ink";

/** Character used to represent the filled portion of the progress bar. */
const FILLED = "━";

/** Character used to represent the empty portion of the progress bar. */
const EMPTY = "░";

/** Default number of characters in the progress bar. */
const DEFAULT_WIDTH = 20;

/** Props accepted by the {@link ProgressBar} component. */
export interface ProgressBarProps {
  /**
   * Number of completed units (numerator).
   * @example 8
   */
  done: number;

  /**
   * Total number of units (denominator).
   * @example 21
   */
  total: number;

  /**
   * Total character width of the bar (excluding the percentage label).
   * Defaults to 20.
   * @example 20
   */
  width?: number;
}

/**
 * Render the progress bar as a plain string (without the React wrapper).
 *
 * Useful for testing or embedding in non-React output.
 *
 * @param done   - Number of completed units.
 * @param total  - Total number of units.
 * @param width  - Character width of the bar portion (default: {@link DEFAULT_WIDTH}).
 * @returns A string like `━━━━━━━━░░░░░░░░░░░░  38%`.
 */
export function renderProgressBar(
  done: number,
  total: number,
  width: number = DEFAULT_WIDTH
): string {
  const ratio = total > 0 ? Math.min(done / total, 1) : 0;
  const filledCount = Math.round(ratio * width);
  const emptyCount = width - filledCount;
  const pct = Math.round(ratio * 100);

  const bar = FILLED.repeat(filledCount) + EMPTY.repeat(emptyCount);
  return `${bar}  ${pct}%`;
}

/**
 * Progress bar component for the harness CLI.
 *
 * Displays a horizontal bar with a filled section proportional to `done / total`
 * followed by a percentage label.
 *
 * @param props - {@link ProgressBarProps}
 * @returns A React element containing the progress bar.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { ProgressBar } from './components/progress.js';
 *
 * render(<ProgressBar done={8} total={21} />);
 * // Output: ━━━━━━━━░░░░░░░░░░░░  38%
 * ```
 */
export function ProgressBar({
  done,
  total,
  width = DEFAULT_WIDTH,
}: ProgressBarProps): React.ReactElement {
  return <Text>{renderProgressBar(done, total, width)}</Text>;
}
