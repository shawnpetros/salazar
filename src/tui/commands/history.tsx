/**
 * history command handler and interactive history list component.
 *
 * Reads session history from the SQLite database (replaces old config-based
 * history). Provides both interactive (Ink) and non-interactive (plain text)
 * interfaces.
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { getDb } from "../../engine/storage.js";
import type { SessionRow } from "../../lib/types.js";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "n/a";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

function loadSessionRows(): SessionRow[] {
  const db = getDb();
  const rows = db.getCompletedSessions();
  return rows.map((row) => ({
    id: String(row["id"] ?? ""),
    specName: String(row["spec_name"] ?? "unknown"),
    specDescription: String(row["spec_description"] ?? ""),
    state: (row["state"] as SessionRow["state"]) ?? "complete",
    phase: String(row["phase"] ?? ""),
    modelGenerator: String(row["model_generator"] ?? ""),
    modelEvaluator: String(row["model_evaluator"] ?? ""),
    startedAt: String(row["started_at"] ?? ""),
    completedAt: row["completed_at"] ? String(row["completed_at"]) : null,
    totalCost: Number(row["total_cost"] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// Interactive history list component
// ---------------------------------------------------------------------------

/** Props accepted by {@link InteractiveHistoryList}. */
export interface HistoryListProps {
  sessions: SessionRow[];
  onExit?: () => void;
}

/**
 * Interactive history list Ink component.
 *
 * Renders a numbered list of past sessions. Keyboard controls:
 * - down arrow: move cursor to the next row
 * - up arrow: move cursor to the previous row
 * - Enter: open the detail view for the selected session
 * - q / Esc: exit
 */
export function InteractiveHistoryList({
  sessions,
  onExit,
}: HistoryListProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detailSession, setDetailSession] = useState<SessionRow | null>(null);

  useInput((input, key) => {
    // Detail view -- any of q / Esc / Enter returns to list
    if (detailSession !== null) {
      if (key.escape || key.return || input === "q") {
        setDetailSession(null);
      }
      return;
    }

    // List view
    if (input === "q" || key.escape) {
      onExit?.();
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(prev + 1, sessions.length - 1));
    } else if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (key.return) {
      const session = sessions[selectedIndex];
      if (session) setDetailSession(session);
    }
  });

  // Detail view
  if (detailSession !== null) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text bold color="cyan">{"Session Detail"}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text><Text bold>{"ID:        "}</Text>{detailSession.id}</Text>
          <Text><Text bold>{"Spec:      "}</Text>{detailSession.specName}</Text>
          <Text><Text bold>{"State:     "}</Text>{detailSession.state}</Text>
          <Text><Text bold>{"Generator: "}</Text>{detailSession.modelGenerator}</Text>
          <Text><Text bold>{"Evaluator: "}</Text>{detailSession.modelEvaluator}</Text>
          <Text><Text bold>{"Cost:      "}</Text>{formatCost(detailSession.totalCost)}</Text>
          <Text><Text bold>{"Started:   "}</Text>{formatDate(detailSession.startedAt)}</Text>
          <Text><Text bold>{"Completed: "}</Text>{formatDate(detailSession.completedAt)}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>{"Press Enter, Esc, or q to go back"}</Text>
        </Box>
      </Box>
    );
  }

  // Empty list
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

  // List view
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
          session.state.padStart(10),
          formatCost(session.totalCost).padStart(7),
          formatDate(session.startedAt).padStart(14),
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
        <Text dimColor>{"Use arrow keys to navigate, Enter for details, q to quit"}</Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Public non-interactive API
// ---------------------------------------------------------------------------

/**
 * Execute the `history` command in non-interactive (plain-text) mode.
 */
export function historyCommand(): void {
  const sessions = loadSessionRows();

  if (sessions.length === 0) {
    console.log("No session history found.");
    return;
  }

  console.log("Session History");
  console.log("===============");
  for (const s of sessions) {
    console.log(
      `${s.id.slice(0, 12).padEnd(14)} ${s.specName.slice(0, 28).padEnd(30)} ` +
      `${s.state.padEnd(10)} ${formatCost(s.totalCost).padStart(7)}  ` +
      `${formatDate(s.startedAt)}`,
    );
  }
}

/**
 * Get session list for interactive rendering.
 */
export function loadSessions(): SessionRow[] {
  return loadSessionRows();
}
