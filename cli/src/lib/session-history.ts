/**
 * Session history utilities for persisting completed harness run records.
 *
 * When a harness session finishes (a `session_complete` event is received),
 * these helpers build a {@link SessionRecord} summary and append it to the
 * config history file so it can be reviewed via `harness history`.
 *
 * @example
 * ```ts
 * import { saveSessionToHistory } from './lib/session-history.js';
 *
 * saveSessionToHistory(
 *   sessionId,
 *   specPath,
 *   sessionCompleteEvent,
 *   config,
 * );
 * ```
 */

import { writeConfig } from "./config.js";
import type {
  HarnessConfig,
  HarnessHistoryEntry,
  SessionCompleteEvent,
  SessionRecord,
} from "./types.js";

// ---------------------------------------------------------------------------
// buildSessionRecord
// ---------------------------------------------------------------------------

/**
 * Builds a {@link SessionRecord} from a completed harness session.
 *
 * The `score` is computed as `(passing / totalFeatures) * 10`, clamped to the
 * range `[0, 10]`.  When `totalFeatures` is `0` the score defaults to `0`.
 *
 * @param sessionId  - Unique session identifier (from the `session_start` event).
 * @param specName   - Path or name of the spec file that was run.
 * @param event      - The `session_complete` event carrying final session stats.
 * @param timestamp  - Optional ISO 8601 timestamp.  Defaults to `new Date().toISOString()`.
 * @returns A fully-populated {@link SessionRecord} ready to be persisted.
 *
 * @example
 * ```ts
 * const record = buildSessionRecord('abc123', 'spec.md', {
 *   type: 'session_complete',
 *   passing: 8,
 *   totalFeatures: 10,
 *   durationMs: 60000,
 *   cost: 2.5,
 * });
 * // record.id === 'abc123'
 * // record.score === 8.0
 * ```
 */
export function buildSessionRecord(
  sessionId: string,
  specName: string,
  event: SessionCompleteEvent,
  timestamp?: string
): SessionRecord {
  const score =
    event.totalFeatures > 0
      ? Math.min(10, (event.passing / event.totalFeatures) * 10)
      : 0;

  return {
    id: sessionId,
    specName,
    featuresTotal: event.totalFeatures,
    featuresPassing: event.passing,
    score,
    durationMs: event.durationMs,
    cost: event.cost,
    timestamp: timestamp ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// saveSessionToHistory
// ---------------------------------------------------------------------------

/**
 * Saves a completed harness session to `config.history` and writes the
 * updated config to disk via {@link writeConfig}.
 *
 * Internally builds a {@link SessionRecord} from the supplied parameters,
 * maps it to a {@link HarnessHistoryEntry} (the shape stored in
 * `config.history`), appends it to the existing history array, and persists
 * the result.
 *
 * @param sessionId  - Unique session identifier.
 * @param specName   - Path or name of the spec file that was run.
 * @param event      - The `session_complete` event carrying final session stats.
 * @param config     - The current harness config (will not be mutated).
 * @param configPath - Optional override for the config file path.  Defaults to
 *   `~/.harness/config.json`.  Useful for testing.
 *
 * @example
 * ```ts
 * saveSessionToHistory('abc123', 'spec.md', sessionCompleteEvent, config);
 * // config.history now contains a new HarnessHistoryEntry for this session
 * ```
 */
export function saveSessionToHistory(
  sessionId: string,
  specName: string,
  event: SessionCompleteEvent,
  config: HarnessConfig,
  configPath?: string
): void {
  const record = buildSessionRecord(sessionId, specName, event);

  // Map SessionRecord → HarnessHistoryEntry (the persisted shape).
  const entry: HarnessHistoryEntry = {
    sessionId: record.id,
    specName: record.specName,
    startedAt: record.timestamp,
    success: record.featuresPassing === record.featuresTotal,
  };

  const updatedConfig: HarnessConfig = {
    ...config,
    history: [...config.history, entry],
  };

  writeConfig(updatedConfig, configPath);
}
