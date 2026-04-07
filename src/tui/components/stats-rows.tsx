/**
 * StatsRows component — renders the evaluator score row and cost row
 * in the harness CLI run view.
 *
 * Renders two lines:
 *  1. `Last evaluator: 8.5/10 (Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0)`
 *  2. `Cost: $1.42 (plan: $0.50, gen: $0.72, eval: $0.20)`
 *
 * @example
 * ```
 * Last evaluator: 8.5/10 (Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0)
 * Cost: $1.42 (plan: $0.50, gen: $0.72, eval: $0.20)
 * ```
 */

import React from "react";
import { Box, Text } from "ink";
import type { EvaluatorResultEvent, CostUpdateEvent } from "../../lib/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props accepted by the {@link StatsRows} component. */
export interface StatsRowsProps {
  /**
   * The most recent evaluator result, or `null` if none has arrived yet.
   * When `null`, the evaluator row is not rendered.
   */
  lastEvaluator: EvaluatorResultEvent | null;

  /**
   * The most recent cost update event, or `null` if none has arrived yet.
   * When `null`, the cost row is not rendered.
   */
  costUpdate: CostUpdateEvent | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a single numeric score to one decimal place.
 *
 * @param value - The numeric score value.
 * @returns String with exactly one decimal place (e.g. `'8.5'`, `'9.0'`).
 *
 * @example
 * ```ts
 * formatScore(9) // → '9.0'
 * formatScore(8.5) // → '8.5'
 * ```
 */
export function formatScore(value: number): string {
  return value.toFixed(1);
}

/**
 * Format a cost value as a dollar string with two decimal places.
 *
 * @param value - The cost in USD.
 * @returns Dollar-prefixed string with two decimal places (e.g. `'$1.42'`).
 *
 * @example
 * ```ts
 * formatCost(1.42) // → '$1.42'
 * formatCost(0.5) // → '$0.50'
 * ```
 */
export function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Render the evaluator score row as a plain string.
 *
 * Formats: `'Last evaluator: {score}/10 ({dim1}: {val1}, {dim2}: {val2}, ...)'`
 *
 * Dimension values are rendered with one decimal place.
 *
 * @param evaluator - The evaluator result event to format.
 * @returns Formatted evaluator row string.
 *
 * @example
 * ```ts
 * renderEvaluatorRow({
 *   type: 'evaluator_result',
 *   score: 8.5,
 *   dimensions: { Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0 },
 *   feedback: '',
 * })
 * // → 'Last evaluator: 8.5/10 (Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0)'
 * ```
 */
export function renderEvaluatorRow(evaluator: EvaluatorResultEvent): string {
  const dims = Object.entries(evaluator.dimensions)
    .map(([key, val]) => `${key}: ${formatScore(val)}`)
    .join(", ");
  return `Last evaluator: ${formatScore(evaluator.score)}/10 (${dims})`;
}

/**
 * Render the cost row as a plain string.
 *
 * Formats: `'Cost: $X.XX (agent1: $X.XX, agent2: $X.XX, ...)'`
 *
 * Agent costs are rendered with two decimal places.
 *
 * @param costUpdate - The cost update event to format.
 * @returns Formatted cost row string.
 *
 * @example
 * ```ts
 * renderCostRow({
 *   type: 'cost_update',
 *   total: 1.42,
 *   byAgent: { plan: 0.50, gen: 0.72, eval: 0.20 },
 * })
 * // → 'Cost: $1.42 (plan: $0.50, gen: $0.72, eval: $0.20)'
 * ```
 */
export function renderCostRow(costUpdate: CostUpdateEvent): string {
  const agents = Object.entries(costUpdate.byAgent)
    .map(([agent, val]) => `${agent}: ${formatCost(val)}`)
    .join(", ");
  return `Cost: ${formatCost(costUpdate.total)} (${agents})`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * StatsRows component for the harness CLI run view.
 *
 * Renders up to two informational rows beneath the progress display:
 *  - **Evaluator row**: Shows the last evaluator score and per-dimension
 *    breakdown. Only rendered when `lastEvaluator` is non-null.
 *  - **Cost row**: Shows the total session cost and per-agent breakdown.
 *    Only rendered when `costUpdate` is non-null.
 *
 * @param props - {@link StatsRowsProps}
 * @returns A React element containing the stats rows (may be empty if both
 *   props are `null`).
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { StatsRows } from './components/stats-rows.js';
 *
 * render(
 *   <StatsRows
 *     lastEvaluator={{
 *       type: 'evaluator_result',
 *       score: 8.5,
 *       dimensions: { Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0 },
 *       feedback: '',
 *     }}
 *     costUpdate={{
 *       type: 'cost_update',
 *       total: 1.42,
 *       byAgent: { plan: 0.50, gen: 0.72, eval: 0.20 },
 *     }}
 *   />
 * );
 * // Output:
 * // Last evaluator: 8.5/10 (Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0)
 * // Cost: $1.42 (plan: $0.50, gen: $0.72, eval: $0.20)
 * ```
 */
export function StatsRows({
  lastEvaluator,
  costUpdate,
}: StatsRowsProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {lastEvaluator !== null && (
        <Text>{renderEvaluatorRow(lastEvaluator)}</Text>
      )}
      {costUpdate !== null && (
        <Text>{renderCostRow(costUpdate)}</Text>
      )}
    </Box>
  );
}
