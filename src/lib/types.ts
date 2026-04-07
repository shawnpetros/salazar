// Event types — preserved exactly from cli/src/lib/types.ts (proven design)

export interface SessionStartEvent {
  type: "session_start";
  sessionId: string;
  spec: string;
}

export interface PlannerCompleteEvent {
  type: "planner_complete";
  features: number;
  durationMs: number;
}

export interface FeatureStartEvent {
  type: "feature_start";
  id: string;
  iteration: number;
  done: number;
  total: number;
  name: string;
}

export interface FeatureCompleteEvent {
  type: "feature_complete";
  id: string;
  score: number | null;
  durationMs: number;
  complexity: string;
}

export interface ValidatorResultEvent {
  type: "validator_result";
  name: string;
  passed: boolean;
}

export interface EvaluatorResultEvent {
  type: "evaluator_result";
  score: number;
  dimensions: Record<string, number>;
  feedback: string;
}

export interface CostUpdateEvent {
  type: "cost_update";
  total: number;
  byAgent: Record<string, number>;
}

export interface SessionCompleteEvent {
  type: "session_complete";
  totalFeatures: number;
  passing: number;
  durationMs: number;
  cost: number;
}

export interface SessionErrorEvent {
  type: "session_error";
  error: string;
}

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

export type HarnessEventType = HarnessEvent["type"];

// Engine internals

export interface Feature {
  id: string;
  category: string;
  description: string;
  priority: number;
  complexity: "setup" | "simple" | "moderate" | "complex";
  steps: string[];
  passes: boolean;
}

export interface ProgressReport {
  total: number;
  passing: number;
  items: Feature[];
  percent: number;
  isComplete: boolean;
}

export interface ValidationResult {
  name: string;
  passed: boolean;
  output: string;
}

export interface ValidatorConfig {
  packageManager: "npm" | "pnpm" | "yarn" | "bun";
  typecheck: string | null;
  lint: string | null;
  build: string | null;
  test: string | null;
}

export interface EvaluatorScores {
  specCompliance: number;
  codeQuality: number;
  security: number;
  usability: number;
}

export interface EvalResult {
  score: number;
  passed: boolean;
  feedback: string;
  dimensionScores: EvaluatorScores;
  costUsd: number;
}

export interface SalazarConfig {
  models: {
    default: string;
    planner: string;
    generator: string;
    evaluator: string;
  };
  output: {
    defaultDir: string;
  };
}

export interface SessionRow {
  id: string;
  specName: string;
  specDescription: string;
  state: "running" | "complete" | "error";
  phase: string;
  modelGenerator: string;
  modelEvaluator: string;
  startedAt: string;
  completedAt: string | null;
  totalCost: number;
}
