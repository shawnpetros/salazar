/**
 * F053 — run command: exit with code 0 on full pass, code 1 on failures or error
 *
 * Verifies that:
 *  - getExitCode is exported from run-dashboard.tsx
 *  - getExitCode returns 0 when all features passed (passing === totalFeatures)
 *  - getExitCode returns 1 when some features failed (passing < totalFeatures)
 *  - getExitCode returns 1 when hadError is true
 *  - getExitCode returns 1 when event is null (no session_complete received)
 *  - getExitCode returns 1 when hadError is true even if event shows full pass
 *  - run-dashboard.tsx source uses getExitCode in the onDone callback
 *  - run-dashboard.tsx handles session_error by calling process.exit(1)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SessionCompleteEvent } from "../lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// getExitCode — export check
// ---------------------------------------------------------------------------

describe("F053 — getExitCode exports", () => {
  it("is exported as a function from run-dashboard.tsx", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    expect(typeof getExitCode).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// getExitCode — full pass scenarios
// ---------------------------------------------------------------------------

describe("F053 — getExitCode: full pass", () => {
  it("returns 0 when passing === totalFeatures", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    const event: SessionCompleteEvent = {
      type: "session_complete",
      passing: 10,
      totalFeatures: 10,
      durationMs: 60000,
      cost: 2.50,
    };
    expect(getExitCode(event, false)).toBe(0);
  });

  it("returns 0 when all 38 features pass (BDD scenario)", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    const event: SessionCompleteEvent = {
      type: "session_complete",
      passing: 38,
      totalFeatures: 38,
      durationMs: 33480000,
      cost: 9.27,
    };
    expect(getExitCode(event, false)).toBe(0);
  });

  it("returns 0 when single feature passes", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    const event: SessionCompleteEvent = {
      type: "session_complete",
      passing: 1,
      totalFeatures: 1,
      durationMs: 1000,
      cost: 0.01,
    };
    expect(getExitCode(event, false)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getExitCode — failure scenarios
// ---------------------------------------------------------------------------

describe("F053 — getExitCode: failures", () => {
  it("returns 1 when passing < totalFeatures (some failures)", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    const event: SessionCompleteEvent = {
      type: "session_complete",
      passing: 8,
      totalFeatures: 10,
      durationMs: 60000,
      cost: 2.00,
    };
    expect(getExitCode(event, false)).toBe(1);
  });

  it("returns 1 when passing is 0 out of many features", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    const event: SessionCompleteEvent = {
      type: "session_complete",
      passing: 0,
      totalFeatures: 21,
      durationMs: 5000,
      cost: 0.50,
    };
    expect(getExitCode(event, false)).toBe(1);
  });

  it("returns 1 when only one feature failed out of many", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    const event: SessionCompleteEvent = {
      type: "session_complete",
      passing: 20,
      totalFeatures: 21,
      durationMs: 100000,
      cost: 5.00,
    };
    expect(getExitCode(event, false)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getExitCode — error scenarios
// ---------------------------------------------------------------------------

describe("F053 — getExitCode: session_error", () => {
  it("returns 1 when hadError is true and event is null", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    expect(getExitCode(null, true)).toBe(1);
  });

  it("returns 1 when hadError is true even with a full-pass event", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    const event: SessionCompleteEvent = {
      type: "session_complete",
      passing: 10,
      totalFeatures: 10,
      durationMs: 60000,
      cost: 2.50,
    };
    // Error takes precedence over a passing event
    expect(getExitCode(event, true)).toBe(1);
  });

  it("returns 1 when event is null and no error (missing session_complete)", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    expect(getExitCode(null, false)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Source-level assertions: run-dashboard.tsx uses correct exit code logic
// ---------------------------------------------------------------------------

describe("F053 — run-dashboard.tsx source structure", () => {
  const getSource = () =>
    readFileSync(resolve(srcRoot, "components/run-dashboard.tsx"), "utf-8");

  it("exports getExitCode function", () => {
    expect(getSource()).toContain("export function getExitCode");
  });

  it("source uses getExitCode in onDone callback", () => {
    expect(getSource()).toContain("getExitCode");
  });

  it("source calls process.exit with the result of getExitCode", () => {
    const src = getSource();
    expect(src).toContain("process.exit(exitCode)");
  });

  it("source handles session_error status with process.exit(1)", () => {
    const src = getSource();
    // Error path must also produce exit code 1
    expect(src).toContain("process.exit(1)");
  });

  it("source checks for error status to provide exit code 1", () => {
    const src = getSource();
    expect(src).toContain('"error"');
  });

  it("getExitCode checks passing === totalFeatures", () => {
    const src = getSource();
    expect(src).toContain("passing === totalFeatures");
  });

  it("getExitCode accepts SessionCompleteEvent param", () => {
    const src = getSource();
    expect(src).toContain("SessionCompleteEvent");
  });

  it("getExitCode accepts hadError boolean param", () => {
    const src = getSource();
    expect(src).toContain("hadError");
  });

  it("getExitCode returns 0 for full pass", () => {
    const src = getSource();
    expect(src).toContain("return 0");
  });

  it("getExitCode returns 1 for failures", () => {
    const src = getSource();
    expect(src).toContain("return 1");
  });
});

// ---------------------------------------------------------------------------
// React element: Completion onDone receives correct exit code
// ---------------------------------------------------------------------------

describe("F053 — RunDashboard passes correct exit logic to Completion", () => {
  it("getExitCode(fullPassEvent, false) produces 0 for process.exit(0)", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    const fullPass: SessionCompleteEvent = {
      type: "session_complete",
      passing: 5,
      totalFeatures: 5,
      durationMs: 5000,
      cost: 1.0,
    };
    expect(getExitCode(fullPass, false)).toBe(0);
  });

  it("getExitCode(partialPassEvent, false) produces 1 for process.exit(1)", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    const partial: SessionCompleteEvent = {
      type: "session_complete",
      passing: 3,
      totalFeatures: 5,
      durationMs: 5000,
      cost: 1.0,
    };
    expect(getExitCode(partial, false)).toBe(1);
  });

  it("getExitCode(null, true) produces 1 for session_error path", async () => {
    const { getExitCode } = await import("../components/run-dashboard.js");
    expect(getExitCode(null, true)).toBe(1);
  });
});
