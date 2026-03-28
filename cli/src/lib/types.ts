/**
 * HarnessEvent — discriminated union covering all log event variants
 * emitted by the Python harness orchestrator.
 *
 * Each variant carries a `type` discriminant so TypeScript can narrow
 * the union exhaustively in switch/if chains.
 */

// ---------------------------------------------------------------------------
// Individual event variants
// ---------------------------------------------------------------------------

/** Emitted when the orchestrator starts a new harness session. */
export interface SessionStartEvent {
  type: "session_start";
  /** Unique session identifier (e.g. 'abc123'). */
  sessionId: string;
  /** Path or name of the feature spec being run. */
  spec: string;
}

/** Emitted when the planner agent finishes creating the feature list. */
export interface PlannerCompleteEvent {
  type: "planner_complete";
  /** Total number of features planned. */
  features: number;
  /** How long the planner took in milliseconds. */
  durationMs: number;
}

/** Emitted at the start of each feature iteration. */
export interface FeatureStartEvent {
  type: "feature_start";
  /** Feature identifier (e.g. 'F003'). */
  id: string;
  /** Current iteration attempt number (1-based). */
  iteration: number;
  /** Number of features completed so far. */
  done: number;
  /** Total number of features to complete. */
  total: number;
  /** Human-readable feature name (may be empty string if not yet known). */
  name: string;
}

/** Emitted when a feature attempt finishes (pass or fail). */
export interface FeatureCompleteEvent {
  type: "feature_complete";
  /** Feature identifier (e.g. 'F003'). */
  id: string;
  /** Evaluator score (0–10), or null if no evaluator result is available. */
  score: number | null;
  /** How long the feature attempt took in milliseconds. */
  durationMs: number;
  /** Complexity label attached to the feature (e.g. 'simple', 'moderate'). */
  complexity: string;
}

/** Emitted for each individual validator check result. */
export interface ValidatorResultEvent {
  type: "validator_result";
  /** Validator name (e.g. 'TypeCheck', 'Lint'). */
  name: string;
  /** Whether the validator passed. */
  passed: boolean;
}

/** Emitted when the evaluator agent scores a feature. */
export interface EvaluatorResultEvent {
  type: "evaluator_result";
  /** Overall score (0–10). */
  score: number;
  /** Per-dimension scores keyed by dimension name (e.g. 'Spec', 'Quality'). */
  dimensions: Record<string, number>;
  /** Evaluator feedback text. */
  feedback: string;
}

/** Emitted periodically with updated token cost information. */
export interface CostUpdateEvent {
  type: "cost_update";
  /** Total accumulated cost in USD. */
  total: number;
  /** Per-agent cost breakdown keyed by agent name (e.g. 'plan', 'gen', 'eval'). */
  byAgent: Record<string, number>;
}

/** Emitted when the session finishes successfully. */
export interface SessionCompleteEvent {
  type: "session_complete";
  /** Total number of features attempted. */
  totalFeatures: number;
  /** Number of features that passed. */
  passing: number;
  /** Total session duration in milliseconds. */
  durationMs: number;
  /** Total cost of the session in USD. */
  cost: number;
}

/** Emitted when the session terminates due to a fatal error. */
export interface SessionErrorEvent {
  type: "session_error";
  /** Error message describing what went wrong. */
  error: string;
}

// ---------------------------------------------------------------------------
// Union type
// ---------------------------------------------------------------------------

/**
 * HarnessEvent is a discriminated union of all structured log event types
 * emitted by the Python harness orchestrator.
 *
 * Use the `type` field to narrow to a specific variant:
 * @example
 * ```ts
 * function handle(event: HarnessEvent) {
 *   switch (event.type) {
 *     case 'session_start':
 *       console.log(event.sessionId); // narrowed to SessionStartEvent
 *       break;
 *     case 'session_complete':
 *       console.log(event.passing, '/', event.totalFeatures);
 *       break;
 *   }
 * }
 * ```
 */
export type HarnessEvent =
  | SessionStartEvent
  | PlannerCompleteEvent
  | FeatureStartEvent
  | FeatureCompleteEvent
  | ValidatorResultEvent
  | EvaluatorResultEvent
  | CostUpdateEvent
  | SessionCompleteEvent
  | SessionErrorEvent;

/** All valid `type` discriminants for HarnessEvent. */
export type HarnessEventType = HarnessEvent["type"];

// ---------------------------------------------------------------------------
// SessionRecord — persisted summary of a completed harness run
// ---------------------------------------------------------------------------

/**
 * SessionRecord captures the key metrics from a completed harness session.
 *
 * These records are stored in history and surfaced in the history view so the
 * user can review past runs at a glance without re-reading full run logs.
 *
 * @example
 * ```ts
 * const record: SessionRecord = {
 *   id: "abc123",
 *   specName: "my-spec.md",
 *   featuresTotal: 21,
 *   featuresPassing: 17,
 *   score: 8.1,
 *   durationMs: 4200000,
 *   cost: 2.35,
 *   timestamp: "2026-03-27T12:00:00.000Z",
 * };
 * ```
 */
export interface SessionRecord {
  /** Unique session identifier (e.g. 'abc123'). */
  id: string;
  /** Human-readable name or path of the spec that was run. */
  specName: string;
  /** Total number of features attempted in this session. */
  featuresTotal: number;
  /** Number of features that passed. */
  featuresPassing: number;
  /** Average evaluator score across all features (0–10). */
  score: number;
  /** Total session wall-clock duration in milliseconds. */
  durationMs: number;
  /** Total token cost for the session in USD. */
  cost: number;
  /** ISO 8601 timestamp of when the session started. */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// HarnessConfig — schema type matching ~/.harness/config.json
// ---------------------------------------------------------------------------

/**
 * Model identifiers for each agent role used by the harness orchestrator.
 *
 * Every field is required so that the harness always knows which model to use
 * for each agent role.
 */
export interface HarnessConfigModels {
  /** Default fallback model used when no role-specific override is provided. */
  default: string;
  /** Model used by the planner agent to decompose the spec into features. */
  planner: string;
  /** Model used by the generator agent to implement each feature. */
  generator: string;
  /** Model used by the evaluator agent to score completed features. */
  evaluator: string;
}

/**
 * Dashboard connection settings for the web UI.
 */
export interface HarnessConfigDashboard {
  /** Base URL of the dashboard server (e.g. 'http://localhost:3000'). */
  url: string;
  /** Shared secret used to authenticate dashboard API requests. */
  secret: string;
}

/**
 * Output path settings for generated artifacts.
 */
export interface HarnessConfigOutput {
  /** Default directory where harness run output is written. */
  defaultDir: string;
}

/**
 * Python interpreter settings used to spawn the harness orchestrator process.
 */
export interface HarnessConfigPython {
  /** Absolute path to the Python executable. */
  path: string;
  /** Absolute path to the virtual environment root directory. */
  venvPath: string;
}

/**
 * A single entry in the harness session history log.
 *
 * Each entry records metadata about a completed harness run so the CLI can
 * display a history view without re-reading full run logs.
 */
export interface HarnessHistoryEntry {
  /** Unique session identifier. */
  sessionId: string;
  /** Human-readable spec name or path. */
  specName: string;
  /** ISO 8601 timestamp for when the session started. */
  startedAt: string;
  /** Whether the session completed successfully. */
  success: boolean;
}

/**
 * HarnessConfig is the full schema for `~/.harness/config.json`.
 *
 * This type is used to validate config objects loaded from disk and to provide
 * type-safe access to all configuration values throughout the CLI.
 *
 * @example
 * ```ts
 * const config: HarnessConfig = {
 *   models: {
 *     default: 'claude-opus-4-5',
 *     planner: 'claude-opus-4-5',
 *     generator: 'claude-sonnet-4-5',
 *     evaluator: 'claude-haiku-3-5',
 *   },
 *   dashboard: { url: 'http://localhost:3000', secret: 'abc123' },
 *   output: { defaultDir: '/tmp/harness-output' },
 *   python: { path: '/usr/bin/python3', venvPath: '/home/user/.venvs/harness' },
 *   history: [],
 * };
 * ```
 */
export interface HarnessConfig {
  /** Per-role model identifiers. */
  models: HarnessConfigModels;
  /** Dashboard server connection settings. */
  dashboard: HarnessConfigDashboard;
  /** Output directory settings. */
  output: HarnessConfigOutput;
  /** Python interpreter settings. */
  python: HarnessConfigPython;
  /** Ordered list of past harness session records. */
  history: HarnessHistoryEntry[];
}
