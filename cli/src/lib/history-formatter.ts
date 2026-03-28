/**
 * History formatter utilities for rendering past harness session records
 * as a readable CLI table.
 *
 * These helpers are used by the `harness history` command to produce a
 * numbered list of past sessions with the key summary columns:
 * spec name, features passed/total, score, duration, cost, session ID, and date.
 *
 * @example
 * ```ts
 * import { renderHistoryRows } from './lib/history-formatter.js';
 *
 * const output = renderHistoryRows(records);
 * console.log(output);
 * ```
 */

import type { SessionRecord } from "./types.js";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Formats a duration given in milliseconds into a human-readable string.
 *
 * @param ms - Duration in milliseconds.
 * @returns A string like `'70m 00s'` for 4 200 000 ms.
 *
 * @example
 * ```ts
 * formatDuration(4200000); // '70m 00s'
 * formatDuration(90000);   // '1m 30s'
 * ```
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

/**
 * Formats a cost value in USD to a fixed two-decimal string.
 *
 * @param usd - Cost in US dollars.
 * @returns A string like `'$2.35'`.
 *
 * @example
 * ```ts
 * formatCost(2.35);  // '$2.35'
 * formatCost(0);     // '$0.00'
 * ```
 */
export function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

/**
 * Formats an ISO 8601 timestamp into a short locale date string.
 *
 * @param iso - ISO 8601 timestamp string (e.g. `'2026-03-27T10:00:00.000Z'`).
 * @returns A locale date string such as `'3/27/2026'`.
 *
 * @example
 * ```ts
 * formatDate('2026-03-27T10:00:00.000Z'); // e.g. '3/27/2026'
 * ```
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

/**
 * Formats a score (0–10) to a fixed one-decimal string.
 *
 * @param score - Numeric score in the range [0, 10].
 * @returns A string like `'8.6'`.
 *
 * @example
 * ```ts
 * formatScore(8.6);  // '8.6'
 * formatScore(10);   // '10.0'
 * ```
 */
export function formatScore(score: number): string {
  return score.toFixed(1);
}

// ---------------------------------------------------------------------------
// Table renderer
// ---------------------------------------------------------------------------

/**
 * Column header labels used in the rendered history table.
 *
 * @internal
 */
const HEADERS = ["#", "Spec", "Passed", "Score", "Duration", "Cost", "Session ID", "Date"] as const;

/**
 * Renders a list of {@link SessionRecord} objects as a formatted text table
 * with numbered rows.
 *
 * Each row displays the following columns in order:
 * - Row number (1-based)
 * - Spec name (truncated to 30 chars if necessary)
 * - Features passed / total  (e.g. `18/21`)
 * - Evaluator score          (e.g. `8.6`)
 * - Session duration         (e.g. `70m 00s`)
 * - Total cost               (e.g. `$2.35`)
 * - Session ID               (truncated to 8 chars)
 * - Date                     (locale short date)
 *
 * When `records` is empty, a message indicating no history is returned instead.
 *
 * @param records - Array of {@link SessionRecord} objects to render.
 * @returns A multi-line string suitable for printing to a terminal.
 *
 * @example
 * ```ts
 * const output = renderHistoryRows([record1, record2]);
 * console.log(output);
 * // #  Spec              Passed  Score  Duration  Cost   Session ID  Date
 * // 1  feature-spec.md   18/21   8.6    70m 00s   $2.35  abc12345    3/27/2026
 * // 2  other-spec.md     9/10    9.0    30m 00s   $1.50  def45678    3/27/2026
 * ```
 */
export function renderHistoryRows(records: SessionRecord[]): string {
  if (records.length === 0) {
    return "No session history found.";
  }

  // Build the rows as string arrays
  const rows: string[][] = records.map((record, index) => [
    String(index + 1),
    record.specName.length > 30 ? record.specName.slice(0, 27) + "..." : record.specName,
    `${record.featuresPassing}/${record.featuresTotal}`,
    formatScore(record.score),
    formatDuration(record.durationMs),
    formatCost(record.cost),
    record.id.slice(0, 8),
    formatDate(record.timestamp),
  ]);

  // Compute column widths (max of header width vs data width)
  const colWidths: number[] = HEADERS.map((header, col) =>
    Math.max(
      header.length,
      ...rows.map((row) => (row[col] ?? "").length)
    )
  );

  // Build separator line
  const separator = colWidths.map((w) => "-".repeat(w)).join("  ");

  // Build header row
  const headerRow = HEADERS.map((h, i) => h.padEnd(colWidths[i] ?? h.length)).join("  ");

  // Build data rows
  const dataRows = rows.map((row) =>
    row.map((cell, i) => cell.padEnd(colWidths[i] ?? cell.length)).join("  ")
  );

  return [headerRow, separator, ...dataRows].join("\n");
}
