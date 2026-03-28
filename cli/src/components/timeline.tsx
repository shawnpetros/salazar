/**
 * Timeline component — scrollable list of past feature results with timestamps.
 *
 * Renders a titled box containing one row per timeline entry. Each row shows:
 *  - Start offset from session start (e.g. `+1m 46s`)
 *  - Feature duration (e.g. `2m 12s`)
 *  - Feature label with result (e.g. `F001 passed`)
 *
 * @example
 * ```
 * ┌─ Timeline ────────────────────────────────┐
 * │ +0s       5s         F001 passed           │
 * │ +1m 46s   2m 12s     F002 failed           │
 * └───────────────────────────────────────────┘
 * ```
 */

import React from "react";
import { Box, Text } from "ink";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single entry in the timeline representing one completed feature attempt. */
export interface TimelineEntry {
  /**
   * Milliseconds elapsed since the session started when this feature began.
   * @example 106000  (i.e. 1m 46s into the session)
   */
  startOffsetMs: number;

  /**
   * How long this feature attempt took in milliseconds.
   * @example 132000  (i.e. 2m 12s)
   */
  durationMs: number;

  /**
   * Feature identifier (e.g. 'F001').
   * @example 'F001'
   */
  featureId: string;

  /**
   * Result of the feature attempt — typically 'passed' or 'failed'.
   * @example 'passed'
   */
  result: string;
}

/** Props accepted by the {@link Timeline} component. */
export interface TimelineProps {
  /**
   * Array of timeline entries to display, ordered oldest-first.
   */
  entries: TimelineEntry[];
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a millisecond duration as a human-readable string.
 *
 * Produces a compact representation:
 *  - Less than 60 s → `'5s'`
 *  - 60 s or more   → `'1m 5s'`
 *
 * @param ms - Duration in milliseconds.
 * @returns Formatted duration string (e.g. `'2m 12s'`).
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

/**
 * Format a millisecond start offset as a prefixed human-readable string.
 *
 * Always includes a leading `+` to indicate it is a session-relative offset:
 *  - Less than 60 s → `'+5s'`
 *  - 60 s or more   → `'+1m 46s'`
 *
 * @param ms - Offset in milliseconds from the session start.
 * @returns Formatted offset string (e.g. `'+1m 46s'`).
 */
export function formatStartOffset(ms: number): string {
  return `+${formatDuration(ms)}`;
}

/**
 * Render a single timeline entry as a formatted string.
 *
 * The output matches the canonical display format:
 * `'+1m 46s  2m 12s  F001 passed'`
 *
 * Fields are separated by two spaces for visual alignment.
 *
 * @param entry - The timeline entry to render.
 * @returns Formatted entry string.
 */
export function renderTimelineEntry(entry: TimelineEntry): string {
  const offset = formatStartOffset(entry.startOffsetMs);
  const duration = formatDuration(entry.durationMs);
  const label = `${entry.featureId} ${entry.result}`;
  return `${offset}  ${duration}  ${label}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Timeline component for the harness CLI run view.
 *
 * Displays a titled box listing all completed feature attempts with their
 * start offset from the session start, individual duration, and pass/fail
 * result. Entries are rendered oldest-first.
 *
 * @param props - {@link TimelineProps}
 * @returns A React element containing the timeline box.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { Timeline } from './components/timeline.js';
 *
 * render(
 *   <Timeline entries={[
 *     { startOffsetMs: 0,      durationMs: 5000,   featureId: 'F001', result: 'passed' },
 *     { startOffsetMs: 106000, durationMs: 132000, featureId: 'F002', result: 'failed' },
 *   ]} />
 * );
 * ```
 */
export function Timeline({ entries }: TimelineProps): React.ReactElement {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Text bold>Timeline</Text>
      {entries.map((entry) => (
        <Text key={`${entry.featureId}-${entry.startOffsetMs}`}>
          {renderTimelineEntry(entry)}
        </Text>
      ))}
    </Box>
  );
}
