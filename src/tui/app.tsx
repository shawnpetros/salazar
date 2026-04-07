import React, { useState } from "react";
import { Box, Text } from "ink";
import { useEngine } from "./hooks/use-engine.js";

// Run view: subscribes to the engine and renders live progress
function RunView({ specPath }: { specPath: string }) {
  const state = useEngine(specPath);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Salazar</Text>
      <Text>Session: {state.sessionId ?? "starting..."}</Text>
      <Text>Status: {state.status}</Text>
      {state.progress && (
        <Text>Progress: {state.progress.done}/{state.progress.total}</Text>
      )}
      <Text>Cost: ${state.cost.toFixed(2)}</Text>
      {state.done && <Text color="green">Done!</Text>}
      {state.timeline.slice(-5).map((e, i) => (
        <Text key={i} dimColor>{e.type}: {JSON.stringify(e).slice(0, 80)}</Text>
      ))}
    </Box>
  );
}

// Minimal app shell — launcher and config placeholder
export function App({ command }: { command?: string }) {
  const [specPath] = useState<string | null>(null);

  if (command === "config") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="magenta">Salazar — Config</Text>
        <Text dimColor>Use: salazar config set model {"<model-name>"} to change models</Text>
      </Box>
    );
  }

  if (specPath) {
    return <RunView specPath={specPath} />;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">Salazar — The tool that builds itself</Text>
      <Text dimColor>Use: salazar run {"<spec.md>"} to start a build</Text>
    </Box>
  );
}
