/**
 * history command handler and interactive history list component.
 *
 * Provides two complementary interfaces for the `harness history` command:
 *
 * 1. {@link historyCommand} — a plain function that reads config and prints
 *    a formatted text table to stdout (used when piping / non-interactive).
 *
 * 2. {@link InteractiveHistoryList} — an Ink React component that renders an
 *    interactive, arrow-key-navigable list of past sessions.  Pressing ↑/↓
 *    moves the cursor between rows; pressing Enter opens the detail view for
 *    the selected session.
 *
 * @example
 * ```ts
 * // Plain (non-interactive) invocation:
 * historyCommand();
 *
 * // Interactive invocation via Ink:
 * import { render } from 'ink';
 * render(<InteractiveHistoryList sessions={records} onExit={() => process.exit(0)} />);
 * ```
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { readConfig } from "../lib/config.js";
import type { SessionRecord } from "../lib/types.js";
import {
  renderHistoryRows,
  formatCost,
  formatDate,
  formatDuration,
  formatScore,
} from "../lib/history-formatter.js";
import { handleHistoryKey } from "../lib/history-navigation.js";

export type { SessionRecord };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts a raw history entry (which may be either a {@link HarnessHistoryEntry}
 * or a full {@link SessionRecord} written by a newer version of the CLI) into
 * a {@link SessionRecord} suitable for display.
 *
 * Fields that are missing from the stored entry default to `0` / empty string
 * so the display always renders complete rows.
 *
 * @param entry  - Raw entry from `config.history`.
 * @param index  - Zero-based index used to generate a fallback ID.
 * @returns A fully-populated {@link SessionRecord}.
 *
 * @internal
 */
function toSessionRecord(entry: Record<string, unknown>, index: number): SessionRecord {
  // Support both SessionRecord shape (id, timestamp) and HarnessHistoryEntry
  // shape (sessionId, startedAt) so the history command works with both
  // formats of persisted data.
  const id =
    (typeof entry["id"] === "string" && entry["id"]) ||
    (typeof entry["sessionId"] === "string" && entry["sessionId"]) ||
    `session-${index}`;

  const specName =
    typeof entry["specName"] === "string" ? entry["specName"] : "unknown";

  const featuresTotal =
    typeof entry["featuresTotal"] === "number" ? entry["featuresTotal"] : 0;

  const featuresPassing =
    typeof entry["featuresPassing"] === "number" ? entry["featuresPassing"] : 0;

  const score =
    typeof entry["score"] === "number" ? entry["score"] : 0;

  const durationMs =
    typeof entry["durationMs"] === "number" ? entry["durationMs"] : 0;

  const cost =
    typeof entry["cost"] === "number" ? entry["cost"] : 0;

  const timestamp =
    (typeof entry["timestamp"] === "string" && entry["timestamp"]) ||
    (typeof entry["startedAt"] === "string" && entry["startedAt"]) ||
    new Date().toISOString();

  return { id, specName, featuresTotal, featuresPassing, score, durationMs, cost, timestamp };
}

// ---------------------------------------------------------------------------
// Interactive history list component
// ---------------------------------------------------------------------------

/**
 * Discriminated union representing the two screens of the history UI.
 *
 * - `list`   — the scrollable list of past sessions.
 * - `detail` — the full-detail view for a single selected session.
 */
export type HistoryScreenView =
  | { type: "list" }
  | { type: "detail"; session: SessionRecord };

/** Props accepted by {@link InteractiveHistoryList}. */
export interface HistoryListProps {
  /**
   * The session records to display.  Typically obtained from
   * `readConfig().history` after being normalised through
   * {@link toSessionRecord}.
   */
  sessions: SessionRecord[];

  /**
   * Called when the user presses **q** or **Escape** from the list view to
   * signal that the history UI should be unmounted / the process should exit.
   */
  onExit?: () => void;
}

/**
 * Interactive history list Ink component.
 *
 * Renders a numbered list of past harness sessions.  The currently selected
 * row is highlighted with a `>` cursor and cyan colour.  Keyboard controls:
 *
 * - **↓** (downArrow) — move cursor to the next row (clamped at the last item).
 * - **↑** (upArrow)   — move cursor to the previous row (clamped at index 0).
 * - **Enter**         — open the detail view for the selected session.
 * - **q** / **Esc**   — exit the history UI (calls `onExit` if provided).
 *
 * From the detail view, pressing **Enter**, **Esc**, or **q** returns to the
 * list.
 *
 * @param props - {@link HistoryListProps}
 * @returns A React element rendering the interactive history UI.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { InteractiveHistoryList } from './commands/history.js';
 *
 * render(
 *   <InteractiveHistoryList
 *     sessions={records}
 *     onExit={() => process.exit(0)}
 *   />
 * );
 * ```
 */
export function InteractiveHistoryList({
  sessions,
  onExit,
}: HistoryListProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState<HistoryScreenView>({ type: "list" });

  useInput((input, key) => {
    // -----------------------------------------------------------------------
    // Detail view — any of q / Esc / Enter returns to the list.
    // -----------------------------------------------------------------------
    if (view.type === "detail") {
      if (key.escape || key.return || input === "q") {
        setView({ type: "list" });
      }
      return;
    }

    // -----------------------------------------------------------------------
    // List view — q / Esc exits; arrow keys and Enter are handled by the
    // shared handleHistoryKey helper so the navigation logic stays testable.
    // -----------------------------------------------------------------------
    if (input === "q" || key.escape) {
      onExit?.();
      return;
    }

    handleHistoryKey(input, key, {
      selectedIndex,
      totalItems: sessions.length,
      onNavigate: setSelectedIndex,
      onSelect: (i) => {
        const session = sessions[i];
        if (session !== undefined) {
          setView({ type: "detail", session });
        }
      },
    });
  });

  // -------------------------------------------------------------------------
  // Detail view
  // -------------------------------------------------------------------------
  if (view.type === "detail") {
    const { session } = view;
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text bold color="cyan">
          {"Session Detail"}
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            <Text bold>{"ID:        "}</Text>
            {session.id}
          </Text>
          <Text>
            <Text bold>{"Spec:      "}</Text>
            {session.specName}
          </Text>
          <Text>
            <Text bold>{"Features:  "}</Text>
            {`${session.featuresPassing}/${session.featuresTotal}`}
          </Text>
          <Text>
            <Text bold>{"Score:     "}</Text>
            {formatScore(session.score)}
          </Text>
          <Text>
            <Text bold>{"Duration:  "}</Text>
            {formatDuration(session.durationMs)}
          </Text>
          <Text>
            <Text bold>{"Cost:      "}</Text>
            {formatCost(session.cost)}
          </Text>
          <Text>
            <Text bold>{"Date:      "}</Text>
            {formatDate(session.timestamp)}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{"Press Enter, Esc, or q to go back"}</Text>
        </Box>
      </Box>
    );
  }

  // -------------------------------------------------------------------------
  // Empty list
  // -------------------------------------------------------------------------
  if (sessions.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text>{"No session history found."}</Text>
        <Box marginTop={1}>
          <Text dimColor>{"Press q to exit"}</Text>
        </Box>
      </Box>
    );
  }

  // -------------------------------------------------------------------------
  // List view
  // -------------------------------------------------------------------------
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold>{"Session History"}</Text>
      </Box>
      {sessions.map((session, i) => {
        const isSelected = i === selectedIndex;
        const label = [
          isSelected ? ">" : " ",
          String(i + 1).padStart(3),
          ".",
          session.specName.slice(0, 28).padEnd(28),
          `${session.featuresPassing}/${session.featuresTotal}`.padStart(6),
          formatScore(session.score).padStart(5),
          formatDuration(session.durationMs).padStart(9),
          formatCost(session.cost).padStart(7),
        ].join(" ");

        return (
          <Box key={session.id}>
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {label}
            </Text>
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>{"Use ↑↓ to navigate, Enter for details, q to quit"}</Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Public non-interactive API (kept for piped / script usage)
// ---------------------------------------------------------------------------

/**
 * Execute the `history <session-id>` command to display the full detail view
 * for a single session identified by its session ID.
 *
 * Reads the harness configuration from disk, searches the session history for
 * an entry whose `id` matches `sessionId` (exact match or 8-char prefix), and
 * prints all stored fields to stdout.  If no matching session is found, a
 * friendly "not found" message is printed instead.
 *
 * The output includes all fields stored in {@link SessionRecord} plus the
 * model configuration from the current config file so the user can see which
 * models ran the session.
 *
 * @param sessionId  - The session ID to look up (exact or first-8-chars prefix).
 * @param configPath - Override the path to the config file. Defaults to
 *   `~/.harness/config.json`. Useful for testing.
 *
 * @example
 * ```ts
 * // Show detail for session with id prefix 'e631f0ba':
 * historyDetailCommand('e631f0ba');
 * ```
 */
export function historyDetailCommand(sessionId: string, configPath?: string): void {
  const config = readConfig(configPath);

  const rawEntries = config.history as unknown as Record<string, unknown>[];
  const records: SessionRecord[] = rawEntries.map((entry, index) =>
    toSessionRecord(entry, index)
  );

  // Match by exact ID or by 8-char prefix (to allow short-form IDs)
  const session = records.find(
    (r) =>
      r.id === sessionId ||
      r.id.startsWith(sessionId) ||
      r.id.slice(0, 8) === sessionId
  );

  if (!session) {
    console.log(`Session '${sessionId}' not found in history.`);
    return;
  }

  const models = config.models;

  console.log("Session Detail");
  console.log("==============");
  console.log(`ID:        ${session.id}`);
  console.log(`Spec:      ${session.specName}`);
  console.log(`Models:    generator=${models.generator}, evaluator=${models.evaluator}`);
  console.log(`Features:  ${session.featuresPassing}/${session.featuresTotal}`);
  console.log(`Score:     ${formatScore(session.score)}`);
  console.log(`Duration:  ${formatDuration(session.durationMs)}`);
  console.log(`Cost:      ${formatCost(session.cost)}`);
  console.log(`Date:      ${formatDate(session.timestamp)}`);
}

/**
 * Execute the `history` command in non-interactive (plain-text) mode.
 *
 * Reads the harness configuration from disk, extracts the session history,
 * and prints a numbered table to stdout.  Each row shows:
 * - Row number
 * - Spec name
 * - Features passed / total
 * - Evaluator score
 * - Session duration
 * - Total cost
 * - Session ID (first 8 chars)
 * - Date
 *
 * If no history entries exist, a friendly message is printed instead.
 *
 * @param configPath - Override the path to the config file. Defaults to
 *   `~/.harness/config.json`. Useful for testing.
 *
 * @example
 * ```ts
 * // Normal invocation (reads from ~/.harness/config.json):
 * historyCommand();
 *
 * // Test invocation with a custom config path:
 * historyCommand('/tmp/test-config.json');
 * ```
 */
export function historyCommand(configPath?: string): void {
  const config = readConfig(configPath);

  // Cast to an array of unknown-shape records and convert each to SessionRecord.
  const rawEntries = config.history as unknown as Record<string, unknown>[];
  const records: SessionRecord[] = rawEntries.map((entry, index) =>
    toSessionRecord(entry, index)
  );

  console.log(renderHistoryRows(records));
}
