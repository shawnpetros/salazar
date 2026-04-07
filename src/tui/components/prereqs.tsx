/**
 * Prerequisites check component -- runs environment checks before starting
 * a session and displays the pass/fail results.
 *
 * Checks for: Node.js, Claude CLI, and npm.
 */

import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of a single prerequisite check. */
export interface PrereqResult {
  name: string;
  passed: boolean;
  version?: string;
  hint?: string;
}

/** Props accepted by the {@link PrereqsCheck} component. */
export interface PrereqsCheckProps {
  /**
   * Callback invoked when all checks have completed.
   * @param allPassed - `true` if every check passed, `false` otherwise.
   */
  onDone: (allPassed: boolean) => void;
}

// ---------------------------------------------------------------------------
// Check helpers
// ---------------------------------------------------------------------------

function getCommandVersion(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

/**
 * Run all prerequisite checks synchronously.
 * Checks: Node.js, Claude CLI, npm.
 */
export function checkAll(): PrereqResult[] {
  const results: PrereqResult[] = [];

  // Node.js
  const nodeVersion = getCommandVersion("node --version");
  results.push(
    nodeVersion
      ? { name: "Node.js", passed: true, version: nodeVersion }
      : { name: "Node.js", passed: false, hint: "Install from https://nodejs.org" },
  );

  // Claude CLI
  const claudeVersion = getCommandVersion("claude --version");
  results.push(
    claudeVersion
      ? { name: "Claude CLI", passed: true, version: claudeVersion }
      : { name: "Claude CLI", passed: false, hint: "Install: npm install -g @anthropic-ai/claude-code" },
  );

  // npm
  const npmVersion = getCommandVersion("npm --version");
  results.push(
    npmVersion
      ? { name: "npm", passed: true, version: npmVersion }
      : { name: "npm", passed: false, hint: "Installed with Node.js" },
  );

  return results;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Prerequisites check screen.
 *
 * On mount, verifies that Node.js, Claude CLI, and npm are available.
 * Shows a spinner while checks run, then displays each result with a
 * coloured checkmark (green) or cross (red).
 */
export function PrereqsCheck({ onDone }: PrereqsCheckProps): React.ReactElement {
  const [results, setResults] = useState<PrereqResult[] | null>(null);

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
          {" Checking prerequisites..."}
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
              <Text color="green">{"[ok]"}</Text>
              {` ${r.name}  ${r.version ?? ""}`}
            </Text>
          ) : (
            <Text>
              <Text color="red">{"[!!]"}</Text>
              {` ${r.name}  -> ${r.hint ?? ""}`}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
