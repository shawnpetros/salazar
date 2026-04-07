/**
 * Welcome screen component — shown on first launch or before starting a run.
 *
 * Renders a gradient title, a brief description of the harness, and a
 * 'Press Enter to continue' prompt. Pressing Enter invokes the `onContinue`
 * callback so the parent can advance to the next screen.
 *
 * Also exports {@link ReadyScreen}, which is displayed after the config wizard
 * completes. It confirms the saved config path and shows four quick-start
 * command examples.
 */

import React from "react";
import { Box, Text, useInput } from "ink";
import Gradient from "ink-gradient";

/** Props accepted by the {@link Welcome} component. */
export interface WelcomeProps {
  /**
   * Callback invoked when the user presses Enter to proceed past the
   * welcome screen.
   */
  onContinue: () => void;
}

/**
 * Welcome screen for the harness CLI.
 *
 * Displays the application title using an ink-gradient colour wash, a short
 * description of what the harness does, and a 'Press Enter to continue'
 * prompt. Pressing the Enter key calls {@link WelcomeProps.onContinue}.
 *
 * @param props - {@link WelcomeProps}
 * @returns A React element containing the welcome layout.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { Welcome } from './components/welcome.js';
 *
 * render(<Welcome onContinue={() => console.log('continuing')} />);
 * ```
 */
export function Welcome({ onContinue }: WelcomeProps): React.ReactElement {
  useInput((_input, key) => {
    if (key.return) {
      onContinue();
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" paddingTop={1} paddingBottom={1}>
      <Gradient name="rainbow">
        <Text bold>{"⬡ Salazar — Autonomous Code Builder"}</Text>
      </Gradient>
      <Box marginTop={1}>
        <Text dimColor>
          {"Automates feature-driven development: plan, generate, evaluate, repeat."}
        </Text>
      </Box>
      <Box marginTop={2}>
        <Text color="cyan">{"Press Enter to continue"}</Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// ReadyScreen
// ---------------------------------------------------------------------------

/** Props accepted by the {@link ReadyScreen} component. */
export interface ReadyScreenProps {
  /**
   * Callback invoked when the user presses Enter to leave the ready screen
   * and begin using the harness.
   */
  onDone: () => void;
}

/**
 * Ready screen — displayed immediately after the config wizard saves its
 * settings.
 *
 * Confirms that configuration has been persisted and shows four quick-start
 * command examples so the user can get started immediately.
 *
 * @param props - {@link ReadyScreenProps}
 * @returns A React element containing the ready layout.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { ReadyScreen } from './components/welcome.js';
 *
 * render(<ReadyScreen onDone={() => process.exit(0)} />);
 * ```
 */
export function ReadyScreen({ onDone }: ReadyScreenProps): React.ReactElement {
  useInput((_input, key) => {
    if (key.return) {
      onDone();
    }
  });

  return (
    <Box flexDirection="column" paddingTop={1} paddingBottom={1}>
      <Text color="green">{"[ok] Configuration saved to ~/.salazar/config.json"}</Text>
      <Box marginTop={1} flexDirection="column">
        <Text bold>{"Quick-start examples:"}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>{"  salazar run spec.md"}</Text>
          <Text>{"  salazar config"}</Text>
        </Box>
      </Box>
      <Box marginTop={2}>
        <Text color="cyan">{"Press Enter to continue"}</Text>
      </Box>
    </Box>
  );
}
