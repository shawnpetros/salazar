/**
 * F003 — HarnessEvent union type tests
 *
 * Verifies that HarnessEvent is a correctly typed discriminated union with
 * all required variants and their respective fields.
 */

import { describe, it, expect } from "vitest";
import type {
  HarnessEvent,
  HarnessEventType,
  SessionStartEvent,
  PlannerCompleteEvent,
  FeatureStartEvent,
  FeatureCompleteEvent,
  ValidatorResultEvent,
  EvaluatorResultEvent,
  CostUpdateEvent,
  SessionCompleteEvent,
  SessionErrorEvent,
} from "../../lib/types.js";

// ---------------------------------------------------------------------------
// Compile-time type checks (these cause TS errors if the types are wrong)
// ---------------------------------------------------------------------------

/** Helper that asserts a value satisfies HarnessEvent at compile time. */
function assertHarnessEvent(event: HarnessEvent): HarnessEvent {
  return event;
}

describe("F003 — HarnessEvent discriminated union", () => {
  // -------------------------------------------------------------------------
  // session_start
  // -------------------------------------------------------------------------
  describe("session_start variant", () => {
    const event: SessionStartEvent = {
      type: "session_start",
      sessionId: "abc123",
      spec: "my-spec.md",
    };

    it("is assignable to HarnessEvent", () => {
      expect(assertHarnessEvent(event)).toBeDefined();
    });

    it("has type discriminant 'session_start'", () => {
      expect(event.type).toBe("session_start");
    });

    it("has sessionId field", () => {
      expect(event.sessionId).toBe("abc123");
    });

    it("has spec field", () => {
      expect(event.spec).toBe("my-spec.md");
    });

    it("can have empty string spec", () => {
      const e: SessionStartEvent = { type: "session_start", sessionId: "x", spec: "" };
      expect(e.spec).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // planner_complete
  // -------------------------------------------------------------------------
  describe("planner_complete variant", () => {
    const event: PlannerCompleteEvent = {
      type: "planner_complete",
      features: 21,
      durationMs: 0,
    };

    it("is assignable to HarnessEvent", () => {
      expect(assertHarnessEvent(event)).toBeDefined();
    });

    it("has type discriminant 'planner_complete'", () => {
      expect(event.type).toBe("planner_complete");
    });

    it("has features count", () => {
      expect(event.features).toBe(21);
    });

    it("has durationMs field", () => {
      expect(event.durationMs).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // feature_start
  // -------------------------------------------------------------------------
  describe("feature_start variant", () => {
    const event: FeatureStartEvent = {
      type: "feature_start",
      id: "F003",
      iteration: 3,
      done: 2,
      total: 21,
      name: "",
    };

    it("is assignable to HarnessEvent", () => {
      expect(assertHarnessEvent(event)).toBeDefined();
    });

    it("has type discriminant 'feature_start'", () => {
      expect(event.type).toBe("feature_start");
    });

    it("has id field", () => {
      expect(event.id).toBe("F003");
    });

    it("has iteration field", () => {
      expect(event.iteration).toBe(3);
    });

    it("has done field", () => {
      expect(event.done).toBe(2);
    });

    it("has total field", () => {
      expect(event.total).toBe(21);
    });

    it("has name field (may be empty string)", () => {
      expect(event.name).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // feature_complete
  // -------------------------------------------------------------------------
  describe("feature_complete variant", () => {
    const event: FeatureCompleteEvent = {
      type: "feature_complete",
      id: "F003",
      score: null,
      durationMs: 0,
      complexity: "",
    };

    it("is assignable to HarnessEvent", () => {
      expect(assertHarnessEvent(event)).toBeDefined();
    });

    it("has type discriminant 'feature_complete'", () => {
      expect(event.type).toBe("feature_complete");
    });

    it("has id field", () => {
      expect(event.id).toBe("F003");
    });

    it("allows null score", () => {
      expect(event.score).toBeNull();
    });

    it("allows numeric score", () => {
      const e: FeatureCompleteEvent = { ...event, score: 8.5 };
      expect(e.score).toBe(8.5);
    });

    it("has durationMs field", () => {
      expect(event.durationMs).toBe(0);
    });

    it("has complexity field", () => {
      expect(event.complexity).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // validator_result
  // -------------------------------------------------------------------------
  describe("validator_result variant", () => {
    const passingEvent: ValidatorResultEvent = {
      type: "validator_result",
      name: "TypeCheck",
      passed: true,
    };

    const failingEvent: ValidatorResultEvent = {
      type: "validator_result",
      name: "Lint",
      passed: false,
    };

    it("is assignable to HarnessEvent", () => {
      expect(assertHarnessEvent(passingEvent)).toBeDefined();
    });

    it("has type discriminant 'validator_result'", () => {
      expect(passingEvent.type).toBe("validator_result");
    });

    it("has name field", () => {
      expect(passingEvent.name).toBe("TypeCheck");
    });

    it("has passed: true for passing check", () => {
      expect(passingEvent.passed).toBe(true);
    });

    it("has passed: false for failing check", () => {
      expect(failingEvent.passed).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // evaluator_result
  // -------------------------------------------------------------------------
  describe("evaluator_result variant", () => {
    const event: EvaluatorResultEvent = {
      type: "evaluator_result",
      score: 0,
      dimensions: {},
      feedback: "",
    };

    it("is assignable to HarnessEvent", () => {
      expect(assertHarnessEvent(event)).toBeDefined();
    });

    it("has type discriminant 'evaluator_result'", () => {
      expect(event.type).toBe("evaluator_result");
    });

    it("has score field", () => {
      expect(event.score).toBe(0);
    });

    it("has dimensions record", () => {
      expect(event.dimensions).toEqual({});
    });

    it("accepts populated dimensions", () => {
      const e: EvaluatorResultEvent = {
        ...event,
        score: 8.5,
        dimensions: { Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0 },
        feedback: "Good work",
      };
      expect(e.dimensions["Spec"]).toBe(9.0);
      expect(e.feedback).toBe("Good work");
    });

    it("has feedback field", () => {
      expect(event.feedback).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // cost_update
  // -------------------------------------------------------------------------
  describe("cost_update variant", () => {
    const event: CostUpdateEvent = {
      type: "cost_update",
      total: 1.42,
      byAgent: { plan: 0.10, gen: 1.12, eval: 0.20 },
    };

    it("is assignable to HarnessEvent", () => {
      expect(assertHarnessEvent(event)).toBeDefined();
    });

    it("has type discriminant 'cost_update'", () => {
      expect(event.type).toBe("cost_update");
    });

    it("has total cost field", () => {
      expect(event.total).toBe(1.42);
    });

    it("has byAgent breakdown", () => {
      expect(event.byAgent["plan"]).toBe(0.10);
      expect(event.byAgent["gen"]).toBe(1.12);
      expect(event.byAgent["eval"]).toBe(0.20);
    });
  });

  // -------------------------------------------------------------------------
  // session_complete
  // -------------------------------------------------------------------------
  describe("session_complete variant", () => {
    const event: SessionCompleteEvent = {
      type: "session_complete",
      totalFeatures: 0,
      passing: 0,
      durationMs: 4200000,
      cost: 0,
    };

    it("is assignable to HarnessEvent", () => {
      expect(assertHarnessEvent(event)).toBeDefined();
    });

    it("has type discriminant 'session_complete'", () => {
      expect(event.type).toBe("session_complete");
    });

    it("has totalFeatures field", () => {
      expect(event.totalFeatures).toBe(0);
    });

    it("has passing field", () => {
      expect(event.passing).toBe(0);
    });

    it("has durationMs field (in milliseconds)", () => {
      expect(event.durationMs).toBe(4200000);
    });

    it("has cost field", () => {
      expect(event.cost).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // session_error
  // -------------------------------------------------------------------------
  describe("session_error variant", () => {
    const event: SessionErrorEvent = {
      type: "session_error",
      error: "out of memory",
    };

    it("is assignable to HarnessEvent", () => {
      expect(assertHarnessEvent(event)).toBeDefined();
    });

    it("has type discriminant 'session_error'", () => {
      expect(event.type).toBe("session_error");
    });

    it("has error field", () => {
      expect(event.error).toBe("out of memory");
    });
  });

  // -------------------------------------------------------------------------
  // Exhaustive discriminant coverage
  // -------------------------------------------------------------------------
  describe("HarnessEventType covers all 9 variants", () => {
    const allTypes: HarnessEventType[] = [
      "session_start",
      "planner_complete",
      "feature_start",
      "feature_complete",
      "validator_result",
      "evaluator_result",
      "cost_update",
      "session_complete",
      "session_error",
    ];

    it("has exactly 9 event type discriminants", () => {
      expect(allTypes).toHaveLength(9);
    });

    for (const t of allTypes) {
      it(`includes '${t}' as a valid event type`, () => {
        expect(t).toBeTruthy();
      });
    }
  });

  // -------------------------------------------------------------------------
  // Narrowing via switch
  // -------------------------------------------------------------------------
  describe("type narrowing via switch", () => {
    /**
     * Exhaustively handle HarnessEvent via switch — TS will error if any
     * variant is unhandled when `never` is asserted.
     */
    function handleAll(event: HarnessEvent): string {
      switch (event.type) {
        case "session_start":
          return `session_start:${event.sessionId}`;
        case "planner_complete":
          return `planner_complete:${event.features}`;
        case "feature_start":
          return `feature_start:${event.id}`;
        case "feature_complete":
          return `feature_complete:${event.id}`;
        case "validator_result":
          return `validator_result:${event.name}`;
        case "evaluator_result":
          return `evaluator_result:${event.score}`;
        case "cost_update":
          return `cost_update:${event.total}`;
        case "session_complete":
          return `session_complete:${event.passing}`;
        case "session_error":
          return `session_error:${event.error}`;
      }
    }

    it("narrows correctly for each variant", () => {
      const events: HarnessEvent[] = [
        { type: "session_start", sessionId: "s1", spec: "" },
        { type: "planner_complete", features: 5, durationMs: 100 },
        { type: "feature_start", id: "F001", iteration: 1, done: 0, total: 5, name: "" },
        { type: "feature_complete", id: "F001", score: 9, durationMs: 500, complexity: "simple" },
        { type: "validator_result", name: "Lint", passed: true },
        { type: "evaluator_result", score: 9, dimensions: {}, feedback: "" },
        { type: "cost_update", total: 0.5, byAgent: {} },
        { type: "session_complete", totalFeatures: 5, passing: 5, durationMs: 60000, cost: 1.0 },
        { type: "session_error", error: "boom" },
      ];

      const results = events.map(handleAll);
      expect(results).toEqual([
        "session_start:s1",
        "planner_complete:5",
        "feature_start:F001",
        "feature_complete:F001",
        "validator_result:Lint",
        "evaluator_result:9",
        "cost_update:0.5",
        "session_complete:5",
        "session_error:boom",
      ]);
    });
  });
});

// ---------------------------------------------------------------------------
// F005 — SessionRecord type tests
// SessionRecord was removed from the new types.ts (replaced by SessionRow).
// These tests have been deleted since the type no longer exists.
// ---------------------------------------------------------------------------
