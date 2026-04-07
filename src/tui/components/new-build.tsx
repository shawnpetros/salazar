/**
 * NewBuild component -- three-step wizard for starting a new build.
 *
 * Step 1: Output directory (text input with default)
 * Step 2: Spec file path (text input, validates file exists)
 * Step 3: Confirm summary -> start build
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getOutputDir } from "../../lib/paths.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NewBuildResult {
  specPath: string;
  outputDir: string;
}

export interface NewBuildProps {
  /** Default output directory (from config.lastOutputDir or ~/.salazar/output). */
  defaultOutputDir?: string;
  /** Model name to show in the confirm summary. */
  modelName?: string;
  /** Called when the user confirms and wants to start the build. */
  onConfirm: (result: NewBuildResult) => void;
  /** Called when the user backs out to the launcher. */
  onCancel: () => void;
}

type Step = "output-dir" | "spec-path" | "confirm";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewBuild({
  defaultOutputDir,
  modelName,
  onConfirm,
  onCancel,
}: NewBuildProps): React.ReactElement {
  const resolvedDefault = defaultOutputDir || getOutputDir();

  const [step, setStep] = useState<Step>("output-dir");
  const [outputDir, setOutputDir] = useState(resolvedDefault);
  const [specPath, setSpecPath] = useState("");
  const [error, setError] = useState<string | null>(null);

  // -- Step 1: Output directory --
  const handleOutputDirSubmit = (value: string): void => {
    const dir = value.trim() || resolvedDefault;
    setOutputDir(dir);
    setError(null);
    setStep("spec-path");
  };

  // -- Step 2: Spec file path --
  const handleSpecPathSubmit = (value: string): void => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Spec file path is required.");
      return;
    }
    const resolved = resolve(trimmed);
    if (!existsSync(resolved)) {
      setError(`File not found: ${resolved}`);
      return;
    }
    setSpecPath(resolved);
    setError(null);
    setStep("confirm");
  };

  // -- Step 3: Confirm --
  useInput((input, key) => {
    if (step === "confirm") {
      if (key.return) {
        onConfirm({ specPath, outputDir });
      } else if (key.escape || input === "q") {
        onCancel();
      }
    }
    // Allow Esc to go back from any step
    if (step === "output-dir" && key.escape) {
      onCancel();
    }
    if (step === "spec-path" && key.escape) {
      setError(null);
      setStep("output-dir");
    }
  });

  return (
    <Box flexDirection="column" paddingTop={1} paddingBottom={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{"New Build"}</Text>
      </Box>

      {/* Step 1: Output directory */}
      {step === "output-dir" && (
        <Box flexDirection="column">
          <Text color="yellow">{"Step 1/3 -- Output directory:"}</Text>
          <Box marginTop={1}>
            <Text dimColor>{`Default: ${resolvedDefault}`}</Text>
          </Box>
          <Box marginTop={1}>
            <Text>{"> "}</Text>
            <TextInput
              value={outputDir}
              onChange={setOutputDir}
              onSubmit={handleOutputDirSubmit}
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>{"Enter to accept, Esc to go back"}</Text>
          </Box>
        </Box>
      )}

      {/* Step 2: Spec file path */}
      {step === "spec-path" && (
        <Box flexDirection="column">
          <Text dimColor>{`Output: ${outputDir}`}</Text>
          <Text color="yellow">{"Step 2/3 -- Spec file path:"}</Text>
          {error !== null && (
            <Box marginTop={1}>
              <Text color="red">{error}</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text>{"> "}</Text>
            <TextInput
              value={specPath}
              onChange={setSpecPath}
              onSubmit={handleSpecPathSubmit}
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>{"Enter to continue, Esc to go back"}</Text>
          </Box>
        </Box>
      )}

      {/* Step 3: Confirm */}
      {step === "confirm" && (
        <Box flexDirection="column">
          <Text color="yellow">{"Step 3/3 -- Confirm build:"}</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>{"  Spec:   "}<Text bold>{specPath}</Text></Text>
            <Text>{"  Output: "}<Text bold>{outputDir}</Text></Text>
            {modelName && (
              <Text>{"  Model:  "}<Text bold>{modelName}</Text></Text>
            )}
          </Box>
          <Box marginTop={2}>
            <Text color="cyan">{"Press Enter to start build, Esc to cancel"}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
