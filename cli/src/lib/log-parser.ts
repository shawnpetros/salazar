import type { HarnessEvent } from "./types.js";

/**
 * Parses a single log line emitted by the Python harness orchestrator into a
 * structured {@link HarnessEvent}, or returns `null` if the line does not match
 * any known event pattern.
 *
 * @param line - A single line of text from the harness log stream.
 * @returns A typed {@link HarnessEvent} when the line matches a known pattern,
 *   or `null` for unrecognised lines.
 *
 * @example
 * ```ts
 * const event = parseLine('[orchestrator] Starting session abc123');
 * // => { type: 'session_start', sessionId: 'abc123', spec: '' }
 * ```
 */
export function parseLine(line: string): HarnessEvent | null {
  // session_start: "[orchestrator] Starting session <sessionId>"
  const sessionStartMatch = line.match(
    /^\[orchestrator\] Starting session (\S+)/
  );
  if (sessionStartMatch) {
    return {
      type: "session_start",
      sessionId: sessionStartMatch[1] as string,
      spec: "",
    };
  }

  // planner_complete: "[orchestrator] Planner created <N> features"
  const plannerCompleteMatch = line.match(
    /^\[orchestrator\] Planner created (\d+) features/
  );
  if (plannerCompleteMatch) {
    return {
      type: "planner_complete",
      features: parseInt(plannerCompleteMatch[1] as string, 10),
      durationMs: 0,
    };
  }

  // feature_start: "[orchestrator] Iteration <N>: feature <ID> (<done>/<total> done)"
  const featureStartMatch = line.match(
    /^\[orchestrator\] Iteration (\d+): feature (F\d+) \((\d+)\/(\d+) done\)/
  );
  if (featureStartMatch) {
    return {
      type: "feature_start",
      iteration: parseInt(featureStartMatch[1] as string, 10),
      id: featureStartMatch[2] as string,
      done: parseInt(featureStartMatch[3] as string, 10),
      total: parseInt(featureStartMatch[4] as string, 10),
      name: "",
    };
  }

  // feature_complete: "[orchestrator] Feature <ID> PASSED"
  const featureCompleteMatch = line.match(
    /^\[orchestrator\] Feature (F\d+) PASSED/
  );
  if (featureCompleteMatch) {
    return {
      type: "feature_complete",
      id: featureCompleteMatch[1] as string,
      score: null,
      durationMs: 0,
      complexity: "",
    };
  }

  // validator_result: "[validators] <Name>: PASS" or "[validators] <Name>: FAIL"
  const validatorResultMatch = line.match(
    /^\[validators\] (.+): (PASS|FAIL)$/
  );
  if (validatorResultMatch) {
    return {
      type: "validator_result",
      name: validatorResultMatch[1] as string,
      passed: validatorResultMatch[2] === "PASS",
    };
  }

  // evaluator_result: "[evaluator] Feature <ID> evaluation complete"
  const evaluatorResultMatch = line.match(
    /^\[evaluator\] Feature (F\d+) evaluation complete/
  );
  if (evaluatorResultMatch) {
    return {
      type: "evaluator_result",
      score: 0,
      dimensions: {},
      feedback: "",
    };
  }

  // session_complete: "[orchestrator] Session <id> finished in <N>s"
  const sessionCompleteMatch = line.match(
    /^\[orchestrator\] Session \S+ finished in (\d+)s/
  );
  if (sessionCompleteMatch) {
    return {
      type: "session_complete",
      totalFeatures: 0,
      passing: 0,
      durationMs: parseInt(sessionCompleteMatch[1] as string, 10) * 1000,
      cost: 0,
    };
  }

  // session_error: "[orchestrator] Fatal error: <message>"
  const sessionErrorMatch = line.match(/^\[orchestrator\] Fatal error: (.+)$/);
  if (sessionErrorMatch) {
    return {
      type: "session_error",
      error: sessionErrorMatch[1] as string,
    };
  }

  return null;
}
