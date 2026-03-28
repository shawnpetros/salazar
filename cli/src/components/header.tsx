/**
 * Header component — displays the app title and a live elapsed timer.
 *
 * Renders a single header bar with:
 *  - `⬡ <title>` on the left
 *  - `⏱ <elapsed>` on the right
 *  - A horizontal divider line below
 */

import React from "react";
import { Box, Text } from "ink";

/** Props accepted by the {@link Header} component. */
export interface HeaderProps {
  /**
   * The application title shown on the left side of the header bar.
   * @example 'Harness'
   */
  title: string;

  /**
   * Human-readable elapsed time shown on the right side of the header bar.
   * @example '12m 34s'
   */
  elapsed: string;
}

/**
 * Header bar component for the harness CLI.
 *
 * Displays the title with a hexagon glyph (⬡) on the left and an elapsed
 * timer with a timer glyph (⏱) on the right, followed by a horizontal
 * divider line.
 *
 * @param props - {@link HeaderProps}
 * @returns A React element containing the header layout.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { Header } from './components/header.js';
 *
 * render(<Header title="Harness" elapsed="12m 34s" />);
 * ```
 */
export function Header({ title, elapsed }: HeaderProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold>⬡ {title}</Text>
        <Text>⏱ {elapsed}</Text>
      </Box>
      <Text>{"─".repeat(40)}</Text>
    </Box>
  );
}
