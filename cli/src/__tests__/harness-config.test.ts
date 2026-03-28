/**
 * F004 — HarnessConfig schema type tests
 *
 * Verifies that HarnessConfig and its nested sub-types are correctly typed,
 * that valid config objects are accepted by TypeScript, and that all required
 * fields are present.
 */

import { describe, it, expect } from "vitest";
import type {
  HarnessConfig,
  HarnessConfigModels,
  HarnessConfigDashboard,
  HarnessConfigOutput,
  HarnessConfigPython,
  HarnessHistoryEntry,
} from "../lib/types.js";

// ---------------------------------------------------------------------------
// Helper — compile-time assertion that a value satisfies HarnessConfig
// ---------------------------------------------------------------------------

/** Returns the config unchanged; causes a TS compile error if the shape is wrong. */
function assertHarnessConfig(cfg: HarnessConfig): HarnessConfig {
  return cfg;
}

// ---------------------------------------------------------------------------
// A fully-populated valid config used across multiple tests
// ---------------------------------------------------------------------------

const validConfig: HarnessConfig = {
  models: {
    default: "claude-opus-4-5",
    planner: "claude-opus-4-5",
    generator: "claude-sonnet-4-5",
    evaluator: "claude-haiku-3-5",
  },
  dashboard: {
    url: "http://localhost:3000",
    secret: "super-secret-key",
  },
  output: {
    defaultDir: "/tmp/harness-output",
  },
  python: {
    path: "/usr/bin/python3",
    venvPath: "/home/user/.venvs/harness",
  },
  history: [],
};

// ---------------------------------------------------------------------------
// HarnessConfig top-level structure
// ---------------------------------------------------------------------------

describe("F004 — HarnessConfig top-level structure", () => {
  it("is assignable to HarnessConfig when all fields are present", () => {
    expect(assertHarnessConfig(validConfig)).toBeDefined();
  });

  it("has a models field", () => {
    expect(validConfig.models).toBeDefined();
  });

  it("has a dashboard field", () => {
    expect(validConfig.dashboard).toBeDefined();
  });

  it("has an output field", () => {
    expect(validConfig.output).toBeDefined();
  });

  it("has a python field", () => {
    expect(validConfig.python).toBeDefined();
  });

  it("has a history array", () => {
    expect(Array.isArray(validConfig.history)).toBe(true);
  });

  it("accepts an empty history array", () => {
    const cfg: HarnessConfig = { ...validConfig, history: [] };
    expect(cfg.history).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// HarnessConfigModels
// ---------------------------------------------------------------------------

describe("F004 — HarnessConfigModels", () => {
  const models: HarnessConfigModels = {
    default: "claude-opus-4-5",
    planner: "claude-opus-4-5",
    generator: "claude-sonnet-4-5",
    evaluator: "claude-haiku-3-5",
  };

  it("has a default model field", () => {
    expect(models.default).toBe("claude-opus-4-5");
  });

  it("has a planner model field", () => {
    expect(models.planner).toBe("claude-opus-4-5");
  });

  it("has a generator model field", () => {
    expect(models.generator).toBe("claude-sonnet-4-5");
  });

  it("has an evaluator model field", () => {
    expect(models.evaluator).toBe("claude-haiku-3-5");
  });

  it("accepts all four models being the same string", () => {
    const sameModels: HarnessConfigModels = {
      default: "model-a",
      planner: "model-a",
      generator: "model-a",
      evaluator: "model-a",
    };
    expect(sameModels.default).toBe("model-a");
  });
});

// ---------------------------------------------------------------------------
// HarnessConfigDashboard
// ---------------------------------------------------------------------------

describe("F004 — HarnessConfigDashboard", () => {
  const dashboard: HarnessConfigDashboard = {
    url: "http://localhost:3000",
    secret: "super-secret-key",
  };

  it("has a url field", () => {
    expect(dashboard.url).toBe("http://localhost:3000");
  });

  it("has a secret field", () => {
    expect(dashboard.secret).toBe("super-secret-key");
  });

  it("accepts different URL formats", () => {
    const d: HarnessConfigDashboard = {
      url: "https://dashboard.example.com",
      secret: "xyz",
    };
    expect(d.url).toBe("https://dashboard.example.com");
  });
});

// ---------------------------------------------------------------------------
// HarnessConfigOutput
// ---------------------------------------------------------------------------

describe("F004 — HarnessConfigOutput", () => {
  const output: HarnessConfigOutput = {
    defaultDir: "/tmp/harness-output",
  };

  it("has a defaultDir field", () => {
    expect(output.defaultDir).toBe("/tmp/harness-output");
  });

  it("accepts absolute paths", () => {
    const o: HarnessConfigOutput = { defaultDir: "/home/user/projects/agent-id/output" };
    expect(o.defaultDir).toBe("/home/user/projects/agent-id/output");
  });
});

// ---------------------------------------------------------------------------
// HarnessConfigPython
// ---------------------------------------------------------------------------

describe("F004 — HarnessConfigPython", () => {
  const python: HarnessConfigPython = {
    path: "/usr/bin/python3",
    venvPath: "/home/user/.venvs/harness",
  };

  it("has a path field", () => {
    expect(python.path).toBe("/usr/bin/python3");
  });

  it("has a venvPath field", () => {
    expect(python.venvPath).toBe("/home/user/.venvs/harness");
  });

  it("accepts Windows-style paths", () => {
    const p: HarnessConfigPython = {
      path: "C:\\Python311\\python.exe",
      venvPath: "C:\\Users\\user\\.venvs\\harness",
    };
    expect(p.path).toBe("C:\\Python311\\python.exe");
  });
});

// ---------------------------------------------------------------------------
// HarnessHistoryEntry
// ---------------------------------------------------------------------------

describe("F004 — HarnessHistoryEntry", () => {
  const entry: HarnessHistoryEntry = {
    sessionId: "abc123",
    specName: "my-feature-spec.md",
    startedAt: "2026-03-27T12:00:00.000Z",
    success: true,
  };

  it("has a sessionId field", () => {
    expect(entry.sessionId).toBe("abc123");
  });

  it("has a specName field", () => {
    expect(entry.specName).toBe("my-feature-spec.md");
  });

  it("has a startedAt field", () => {
    expect(entry.startedAt).toBe("2026-03-27T12:00:00.000Z");
  });

  it("has a success field set to true for successful runs", () => {
    expect(entry.success).toBe(true);
  });

  it("has a success field set to false for failed runs", () => {
    const failedEntry: HarnessHistoryEntry = { ...entry, success: false };
    expect(failedEntry.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// history array populated
// ---------------------------------------------------------------------------

describe("F004 — HarnessConfig with populated history", () => {
  it("accepts history array with multiple entries", () => {
    const cfg: HarnessConfig = {
      ...validConfig,
      history: [
        {
          sessionId: "session-1",
          specName: "spec-a.md",
          startedAt: "2026-01-01T00:00:00.000Z",
          success: true,
        },
        {
          sessionId: "session-2",
          specName: "spec-b.md",
          startedAt: "2026-01-02T00:00:00.000Z",
          success: false,
        },
      ],
    };

    expect(cfg.history).toHaveLength(2);
    expect(cfg.history[0]?.sessionId).toBe("session-1");
    expect(cfg.history[1]?.success).toBe(false);
  });
});
