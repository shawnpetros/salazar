/**
 * Launcher component -- main menu for returning users.
 *
 * Options:
 *   - Resume (shown only when an incomplete session exists in SQLite)
 *   - New Build
 *   - History
 *   - Settings
 */

import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LauncherAction = "resume" | "new-build" | "history" | "settings";

export interface LauncherProps {
  /** Whether there is an incomplete (running) session to resume. */
  hasResumable: boolean;
  /** Callback when the user picks a menu item. */
  onSelect: (action: LauncherAction) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Launcher({ hasResumable, onSelect }: LauncherProps): React.ReactElement {
  const items: Array<{ label: string; value: LauncherAction }> = [];

  if (hasResumable) {
    items.push({ label: "Resume interrupted build", value: "resume" });
  }

  items.push(
    { label: "New Build", value: "new-build" },
    { label: "History", value: "history" },
    { label: "Settings", value: "settings" },
  );

  const handleSelect = (item: { label: string; value: LauncherAction }): void => {
    onSelect(item.value);
  };

  return (
    <Box flexDirection="column" paddingTop={1} paddingBottom={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{"Salazar"}</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
}
