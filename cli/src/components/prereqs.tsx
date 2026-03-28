/**
 * Prerequisites check component — runs all environment checks before starting
 * a harness session and displays the pass/fail results.
 *
 * Shows a spinner while checks are running, then displays each check result
 * with a ✓/✗ symbol and a version or install hint. Once complete, invokes
 * the `onDone` callback with whether all checks passed.
 */

import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { checkAll, type NamedPrereqResult } from "../lib/prereqs.js";

/** Props accepted by the {@link PrereqsCheck} component. */
export interface PrereqsCheckProps {
  /**
   * Callback invoked when all checks have completed.
   * @param allPassed - `true` if every check passed, `false` otherwise.
   */
  onDone: (allPassed: boolean) => void;
}

/**
 * Prerequisites check screen for the harness CLI.
 *
 * On mount, runs {@link checkAll} to verify that Node.js, Python, the
 * `claude-agent-sdk`, and the Claude CLI are all available. While the checks
 * run a spinner is displayed. Once complete each check is shown with a
 * coloured ✓ (green, with version) or ✗ (red, with install hint), and
 * {@link PrereqsCheckProps.onDone} is called with `true` if all checks
 * passed, or `false` if any failed.
 *
 * @param props - {@link PrereqsCheckProps}
 * @returns A React element containing the prerequisites check layout.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { PrereqsCheck } from './components/prereqs.js';
 *
 * render(<PrereqsCheck onDone={(ok) => console.log('all passed:', ok)} />);
 * ```
 */
export function PrereqsCheck({ onDone }: PrereqsCheckProps): React.ReactElement {
  const [results, setResults] = useState<NamedPrereqResult[] | null>(null);

  useEffect(() => {
    const checks = checkAll();
    setResults(checks);
    const allPassed = checks.every((r) => r.passed);
    onDone(allPassed);
  }, [onDone]);

  if (results === null) {
    return (
      <Box paddingY={1}>
        <Text>
          <Spinner type="dots" />
          {" Checking prerequisites…"}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold>{"Prerequisites"}</Text>
      {results.map((r) => (
        <Box key={r.name} marginTop={0}>
          {r.passed ? (
            <Text>
              <Text color="green">{"✓"}</Text>
              {` ${r.name}  ${r.version ?? ""}`}
            </Text>
          ) : (
            <Text>
              <Text color="red">{"✗"}</Text>
              {` ${r.name}  → ${r.hint ?? ""}`}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
