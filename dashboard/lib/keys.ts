export const TYPES = ["status", "features", "sprint", "commits", "evaluator", "cost", "timeline", "spec"] as const;

export type KeyType = (typeof TYPES)[number];

export function buildKey(sessionId: string, type: string): string {
  return `session:${sessionId}:${type}`;
}

export function getAllKeys(sessionId: string): string[] {
  return TYPES.map((type) => buildKey(sessionId, type));
}
