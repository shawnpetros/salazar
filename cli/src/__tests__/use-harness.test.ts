/**
 * F030 — useHarness hook: spawn process, tail logs, accumulate run state
 *
 * Tests cover:
 *  - createInitialState() returns a well-formed default state
 *  - reduceEvent() correctly folds each HarnessEvent variant into state
 *  - reduceEvent() always appends to timeline regardless of event type
 *  - reduceEvent() is non-mutating (immutable updates)
 *  - useHarness() exports are present and have the expected shapes
 */

import { describe, it, expect } from "vitest";
import {
  createInitialState,
  reduceEvent,
  type HarnessMutableState,
} from "../hooks/use-harness.js";
import type {
  SessionStartEvent,
  FeatureStartEvent,
  EvaluatorResultEvent,
  CostUpdateEvent,
  SessionCompleteEvent,
  SessionErrorEvent,
  PlannerCompleteEvent,
  FeatureCompleteEvent,
  ValidatorResultEvent,
} from "../lib/types.js";

// ---------------------------------------------------------------------------
// createInitialState()
// ---------------------------------------------------------------------------

describe("F030 — createInitialState()", () => {
  it("returns sessionId as null", () => {
    expect(createInitialState().sessionId).toBeNull();
  });

  it("returns status as 'starting'", () => {
    expect(createInitialState().status).toBe("starting");
  });

  it("returns progress as null", () => {
    expect(createInitialState().progress).toBeNull();
  });

  it("returns an empty timeline", () => {
    expect(createInitialState().timeline).toEqual([]);
  });

  it("returns lastEvaluator as null", () => {
    expect(createInitialState().lastEvaluator).toBeNull();
  });

  it("returns cost as 0", () => {
    expect(createInitialState().cost).toBe(0);
  });

  it("returns done as false", () => {
    expect(createInitialState().done).toBe(false);
  });

  it("returns a fresh object on each call (no shared reference)", () => {
    const s1 = createInitialState();
    const s2 = createInitialState();
    expect(s1).not.toBe(s2);
    expect(s1.timeline).not.toBe(s2.timeline);
  });
});

// ---------------------------------------------------------------------------
// reduceEvent() — session_start
// ---------------------------------------------------------------------------

describe("F030 — reduceEvent() session_start", () => {
  const base = createInitialState();
  const event: SessionStartEvent = {
    type: "session_start",
    sessionId: "abc123",
    spec: "spec.md",
  };
  const next = reduceEvent(base, event);

  it("sets sessionId from the event", () => {
    expect(next.sessionId).toBe("abc123");
  });

  it("transitions status to 'running'", () => {
    expect(next.status).toBe("running");
  });

  it("appends the event to timeline", () => {
    expect(next.timeline).toHaveLength(1);
    expect(next.timeline[0]).toEqual(event);
  });

  it("does not mutate the original state", () => {
    expect(base.sessionId).toBeNull();
    expect(base.status).toBe("starting");
    expect(base.timeline).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// reduceEvent() — feature_start
// ---------------------------------------------------------------------------

describe("F030 — reduceEvent() feature_start", () => {
  const base = createInitialState();
  const event: FeatureStartEvent = {
    type: "feature_start",
    id: "F001",
    iteration: 1,
    done: 3,
    total: 21,
    name: "Init",
  };
  const next = reduceEvent(base, event);

  it("sets progress.done", () => {
    expect(next.progress?.done).toBe(3);
  });

  it("sets progress.total", () => {
    expect(next.progress?.total).toBe(21);
  });

  it("appends the event to timeline", () => {
    expect(next.timeline).toHaveLength(1);
  });

  it("does not change status", () => {
    expect(next.status).toBe("starting");
  });
});

// ---------------------------------------------------------------------------
// reduceEvent() — evaluator_result
// ---------------------------------------------------------------------------

describe("F030 — reduceEvent() evaluator_result", () => {
  const base = createInitialState();
  const event: EvaluatorResultEvent = {
    type: "evaluator_result",
    score: 8.5,
    dimensions: { Spec: 9, Quality: 8 },
    feedback: "Well done",
  };
  const next = reduceEvent(base, event);

  it("updates lastEvaluator", () => {
    expect(next.lastEvaluator).toEqual(event);
  });

  it("appends the event to timeline", () => {
    expect(next.timeline).toHaveLength(1);
  });

  it("replaces lastEvaluator on subsequent evaluator events", () => {
    const event2: EvaluatorResultEvent = {
      type: "evaluator_result",
      score: 7,
      dimensions: { Spec: 7 },
      feedback: "Okay",
    };
    const next2 = reduceEvent(next, event2);
    expect(next2.lastEvaluator).toEqual(event2);
    expect(next2.timeline).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// reduceEvent() — cost_update
// ---------------------------------------------------------------------------

describe("F030 — reduceEvent() cost_update", () => {
  const base = createInitialState();
  const event: CostUpdateEvent = {
    type: "cost_update",
    total: 1.23,
    byAgent: { plan: 0.5, gen: 0.73 },
  };
  const next = reduceEvent(base, event);

  it("updates cost", () => {
    expect(next.cost).toBe(1.23);
  });

  it("appends the event to timeline", () => {
    expect(next.timeline).toHaveLength(1);
  });

  it("updates cost again on a second cost_update", () => {
    const event2: CostUpdateEvent = {
      type: "cost_update",
      total: 2.5,
      byAgent: {},
    };
    const next2 = reduceEvent(next, event2);
    expect(next2.cost).toBe(2.5);
  });
});

// ---------------------------------------------------------------------------
// reduceEvent() — session_complete
// ---------------------------------------------------------------------------

describe("F030 — reduceEvent() session_complete", () => {
  const base = createInitialState();
  const event: SessionCompleteEvent = {
    type: "session_complete",
    totalFeatures: 21,
    passing: 18,
    durationMs: 60000,
    cost: 3.14,
  };
  const next = reduceEvent(base, event);

  it("sets status to 'complete'", () => {
    expect(next.status).toBe("complete");
  });

  it("sets done to true", () => {
    expect(next.done).toBe(true);
  });

  it("sets cost from the event", () => {
    expect(next.cost).toBe(3.14);
  });

  it("appends the event to timeline", () => {
    expect(next.timeline).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// reduceEvent() — session_error
// ---------------------------------------------------------------------------

describe("F030 — reduceEvent() session_error", () => {
  const base = createInitialState();
  const event: SessionErrorEvent = {
    type: "session_error",
    error: "Fatal: something went wrong",
  };
  const next = reduceEvent(base, event);

  it("sets status to 'error'", () => {
    expect(next.status).toBe("error");
  });

  it("sets done to true", () => {
    expect(next.done).toBe(true);
  });

  it("appends the event to timeline", () => {
    expect(next.timeline).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// reduceEvent() — events that only append to timeline (no field changes)
// ---------------------------------------------------------------------------

describe("F030 — reduceEvent() pass-through events (timeline only)", () => {
  const base: HarnessMutableState = {
    ...createInitialState(),
    sessionId: "sess1",
    status: "running",
  };

  it("planner_complete appends to timeline without changing other fields", () => {
    const event: PlannerCompleteEvent = {
      type: "planner_complete",
      features: 10,
      durationMs: 5000,
    };
    const next = reduceEvent(base, event);
    expect(next.timeline).toHaveLength(1);
    expect(next.sessionId).toBe("sess1");
    expect(next.status).toBe("running");
  });

  it("feature_complete appends to timeline without changing other fields", () => {
    const event: FeatureCompleteEvent = {
      type: "feature_complete",
      id: "F001",
      score: 9,
      durationMs: 3000,
      complexity: "simple",
    };
    const next = reduceEvent(base, event);
    expect(next.timeline).toHaveLength(1);
    expect(next.status).toBe("running");
  });

  it("validator_result appends to timeline without changing other fields", () => {
    const event: ValidatorResultEvent = {
      type: "validator_result",
      name: "TypeCheck",
      passed: true,
    };
    const next = reduceEvent(base, event);
    expect(next.timeline).toHaveLength(1);
    expect(next.status).toBe("running");
  });
});

// ---------------------------------------------------------------------------
// reduceEvent() — sequential event accumulation
// ---------------------------------------------------------------------------

describe("F030 — reduceEvent() sequential event accumulation", () => {
  it("processes a realistic sequence of events correctly", () => {
    let state = createInitialState();

    const events = [
      { type: "session_start", sessionId: "run42", spec: "spec.md" } as SessionStartEvent,
      { type: "planner_complete", features: 5, durationMs: 2000 } as PlannerCompleteEvent,
      { type: "feature_start", id: "F001", iteration: 1, done: 0, total: 5, name: "Init" } as FeatureStartEvent,
      { type: "validator_result", name: "TypeCheck", passed: true } as ValidatorResultEvent,
      { type: "evaluator_result", score: 9, dimensions: {}, feedback: "great" } as EvaluatorResultEvent,
      { type: "cost_update", total: 0.5, byAgent: {} } as CostUpdateEvent,
      { type: "session_complete", totalFeatures: 5, passing: 5, durationMs: 30000, cost: 1.1 } as SessionCompleteEvent,
    ];

    for (const event of events) {
      state = reduceEvent(state, event);
    }

    expect(state.sessionId).toBe("run42");
    expect(state.status).toBe("complete");
    expect(state.done).toBe(true);
    expect(state.progress).toEqual({ done: 0, total: 5 });
    expect(state.lastEvaluator?.score).toBe(9);
    expect(state.cost).toBe(1.1); // session_complete overrides cost_update
    expect(state.timeline).toHaveLength(events.length);
  });
});

// ---------------------------------------------------------------------------
// Module shape — useHarness is exported and is a function
// ---------------------------------------------------------------------------

describe("F030 — useHarness module exports", () => {
  it("exports useHarness as a function", async () => {
    const mod = await import("../hooks/use-harness.js");
    expect(typeof mod.useHarness).toBe("function");
  });

  it("exports reduceEvent as a function", async () => {
    const mod = await import("../hooks/use-harness.js");
    expect(typeof mod.reduceEvent).toBe("function");
  });

  it("exports createInitialState as a function", async () => {
    const mod = await import("../hooks/use-harness.js");
    expect(typeof mod.createInitialState).toBe("function");
  });
});
