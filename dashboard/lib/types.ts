export type SessionState = "running" | "paused" | "complete" | "error";
export type SessionPhase = "plan" | "generate" | "evaluate" | "validate";

export interface SessionStatus {
  state: SessionState;
  phase: SessionPhase;
  startedAt: string;
  updatedAt: string;
  currentFeature: string;
}

export interface FeatureItem {
  id: string;
  name: string;
  passes: boolean;
  scenario: string;
}

export interface FeaturesData {
  total: number;
  passing: number;
  items: FeatureItem[];
}

export interface SprintData {
  iteration: number;
  phase: string;
  featureName: string;
  goal: string;
}

export interface CommitEntry {
  sha: string;
  message: string;
  timestamp: string;
  filesChanged: number;
}

export interface DimensionScores {
  specCompliance: number;
  codeQuality: number;
  security: number;
  usability: number;
}

export interface EvaluatorScoreEntry {
  score: number;
  ts: string;
}

export interface EvaluatorData {
  lastScore: number;
  feedback: string;
  passRate: number;
  dimensionScores: DimensionScores;
  history: EvaluatorScoreEntry[];
}

export interface AgentCosts {
  planner: number;
  generator: number;
  evaluator: number;
}

export interface CostData {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  byAgent: AgentCosts;
}

export interface TimelineEvent {
  timestamp: string;
  label: string;
  duration?: number;
}

export interface SpecData {
  name: string;
  description: string;
}

export interface SessionSummary {
  sessionId: string;
  completedAt: string;
  specName: string | null;
  featuresTotal: number;
  featuresPassing: number;
  totalCost: number;
  totalTimeMs: number;
  avgEvaluatorScore: number | null;
}

export interface DashboardState {
  sessionId: string | null;
  status: SessionStatus | null;
  features: FeaturesData | null;
  sprint: SprintData | null;
  commits: CommitEntry[] | null;
  evaluator: EvaluatorData | null;
  cost: CostData | null;
  timeline: TimelineEvent[] | null;
  spec: SpecData | null;
}

export const EMPTY_STATE: DashboardState = {
  sessionId: null,
  status: null,
  features: null,
  sprint: null,
  commits: null,
  evaluator: null,
  cost: null,
  timeline: null,
  spec: null,
};
