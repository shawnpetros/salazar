/**
 * Handoff contracts — Zod schemas that gate agent-to-agent transitions.
 *
 * Same pattern as validator gates: if the output doesn't match the contract,
 * the agent retries. No prescriptive prompts — agents write what they want,
 * contracts enforce what we need.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Planner → Orchestrator contract
// ---------------------------------------------------------------------------

export const FeatureSchema = z.object({
  id: z.string(),
  category: z.string().optional().default("general"),
  description: z.string(),
  priority: z.number().optional().default(1),
  complexity: z.enum(["setup", "simple", "moderate", "complex"]),
  steps: z.array(z.string()),
  passes: z.boolean().default(false),
});

export const FeatureListSchema = z.object({
  features: z.array(FeatureSchema).min(1, "Feature list must have at least one feature"),
});

// Also accept bare arrays (some planners write [...] instead of { features: [...] })
export const FeatureListLooseSchema = z.union([
  FeatureListSchema,
  z.array(FeatureSchema).min(1).transform((features) => ({ features })),
]);

// ---------------------------------------------------------------------------
// Evaluator → Orchestrator contract
// ---------------------------------------------------------------------------

export const EvalIssueSchema = z.object({
  severity: z.string(),
  description: z.string(),
  dimension: z.string().optional(),
  file: z.string().optional(),
  line: z.number().optional(),
});

export const EvalOutputSchema = z.object({
  dimensionScores: z.object({
    specCompliance: z.number().min(0).max(10),
    codeQuality: z.number().min(0).max(10),
    security: z.number().min(0).max(10),
    usability: z.number().min(0).max(10),
  }),
  issues: z.array(EvalIssueSchema).optional().default([]),
  recommendations: z.array(z.string()).optional().default([]),
});

export type EvalOutput = z.infer<typeof EvalOutputSchema>;

// ---------------------------------------------------------------------------
// Generic handoff validation
// ---------------------------------------------------------------------------

export type HandoffResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

export function validateHandoff<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): HandoffResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  // Format Zod errors into a readable string for agent feedback
  const issues = result.error.issues.map(
    (i) => `  - ${i.path.join(".")}: ${i.message}`
  ).join("\n");
  return { valid: false, error: `Schema validation failed:\n${issues}` };
}
