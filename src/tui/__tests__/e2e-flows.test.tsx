/**
 * End-to-end TUI flow tests — renders each screen/component with ink-testing-library
 * to verify the full TUI works without a real TTY.
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "ink-testing-library";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function strip(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "").replace(/\x1b\[\?[0-9]*[hl]/g, "");
}

describe("TUI E2E Flows", () => {
  let tmpDir: string;
  let origHome: string | undefined;

  beforeEach(() => {
    origHome = process.env.SALAZAR_HOME;
    tmpDir = mkdtempSync(join(tmpdir(), "salazar-e2e-"));
    process.env.SALAZAR_HOME = tmpDir;
  });

  afterEach(() => {
    if (origHome) process.env.SALAZAR_HOME = origHome;
    else delete process.env.SALAZAR_HOME;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("App entry points", () => {
    it("renders welcome screen on first launch", async () => {
      const { App } = await import("../app.js");
      const { lastFrame, unmount } = render(React.createElement(App));
      const output = strip(lastFrame() ?? "");
      expect(output).toContain("Salazar");
      expect(output).toContain("Press Enter");
      unmount();
    });

    it("renders config view when command=config", async () => {
      const { App } = await import("../app.js");
      const { lastFrame, unmount } = render(React.createElement(App, { command: "config" }));
      const output = strip(lastFrame() ?? "");
      expect(output.length).toBeGreaterThan(0);
      unmount();
    });
  });

  describe("Component smoke tests", () => {
    it("Header renders title and elapsed time", async () => {
      const { Header } = await import("../components/header.js");
      const { lastFrame, unmount } = render(
        React.createElement(Header, { title: "Salazar", elapsed: "1m 30s" })
      );
      const output = strip(lastFrame() ?? "");
      expect(output).toContain("1m 30s");
      unmount();
    });

    it("ProgressBar renders at 0%, 50%, 100%", async () => {
      const { ProgressBar } = await import("../components/progress.js");

      for (const [done, total, pct] of [[0, 10, "0%"], [5, 10, "50%"], [10, 10, "100%"]] as const) {
        const { lastFrame, unmount } = render(
          React.createElement(ProgressBar, { done, total, width: 30 })
        );
        expect(strip(lastFrame() ?? "")).toContain(pct);
        unmount();
      }
    });

    it("CurrentFeatureDisplay renders feature state", async () => {
      const { CurrentFeatureDisplay } = await import("../components/current-feature.js");
      const { lastFrame, unmount } = render(
        React.createElement(CurrentFeatureDisplay, {
          currentFeature: {
            id: "F003",
            name: "Add authentication",
            phase: "generate" as const,
            iteration: 1,
          },
        })
      );
      const output = strip(lastFrame() ?? "");
      expect(output).toContain("F003");
      unmount();
    });

    it("Timeline renders entries", async () => {
      const { Timeline } = await import("../components/timeline.js");
      const entries = [
        { featureId: "F001", result: "passed (8.5/10)", durationMs: 45000, startOffsetMs: 0 },
        { featureId: "F002", result: "passed (validators)", durationMs: 30000, startOffsetMs: 45000 },
      ];
      const { lastFrame, unmount } = render(
        React.createElement(Timeline, { entries })
      );
      const output = strip(lastFrame() ?? "");
      expect(output).toContain("F001");
      expect(output).toContain("F002");
      unmount();
    });

    it("StatsRows renders evaluator and cost", async () => {
      const { StatsRows } = await import("../components/stats-rows.js");
      const { lastFrame, unmount } = render(
        React.createElement(StatsRows, {
          lastEvaluator: {
            type: "evaluator_result" as const,
            score: 8.2,
            dimensions: { specCompliance: 9, codeQuality: 8, security: 7, usability: 8 },
            feedback: "Good implementation",
          },
          costUpdate: {
            type: "cost_update" as const,
            total: 4.52,
            byAgent: { planner: 0.3, generator: 3.5, evaluator: 0.72 },
          },
        })
      );
      const output = strip(lastFrame() ?? "");
      expect(output).toContain("8.2");
      unmount();
    });

    it("StatsRows renders with null evaluator", async () => {
      const { StatsRows } = await import("../components/stats-rows.js");
      const { lastFrame, unmount } = render(
        React.createElement(StatsRows, {
          lastEvaluator: null,
          costUpdate: {
            type: "cost_update" as const,
            total: 1.50,
            byAgent: { planner: 0.2, generator: 1.3, evaluator: 0 },
          },
        })
      );
      const output = strip(lastFrame() ?? "");
      expect(output).toContain("1.50");
      unmount();
    });

    it("Completion renders session complete event", async () => {
      const { Completion } = await import("../components/completion.js");
      const { lastFrame, unmount } = render(
        React.createElement(Completion, {
          event: {
            type: "session_complete" as const,
            totalFeatures: 15,
            passing: 15,
            durationMs: 1992000,
            cost: 9.79,
          },
          outputDir: "/tmp/test-output",
        })
      );
      const output = strip(lastFrame() ?? "");
      expect(output).toContain("15");
      expect(output).toContain("9.79");
      unmount();
    });

    it("Completion renders with partial pass", async () => {
      const { Completion } = await import("../components/completion.js");
      const { lastFrame, unmount } = render(
        React.createElement(Completion, {
          event: {
            type: "session_complete" as const,
            totalFeatures: 15,
            passing: 12,
            durationMs: 1200000,
            cost: 6.50,
          },
          outputDir: "/tmp/test-output",
        })
      );
      const output = strip(lastFrame() ?? "");
      expect(output).toContain("12");
      expect(output).toContain("15");
      unmount();
    });

    it("Welcome screen renders gradient title", async () => {
      const { Welcome } = await import("../components/welcome.js");
      const { lastFrame, unmount } = render(React.createElement(Welcome));
      const output = strip(lastFrame() ?? "");
      expect(output).toContain("Salazar");
      expect(output).toContain("Autonomous Code Builder");
      unmount();
    });

    it("useTimer hook counts elapsed time", async () => {
      const { useTimer } = await import("../hooks/use-timer.js");

      // Render a component that uses the hook
      function TimerTest() {
        const elapsed = useTimer();
        return React.createElement("ink-text", null, `elapsed:${elapsed}`);
      }

      const { lastFrame, unmount } = render(React.createElement(TimerTest));
      const output = strip(lastFrame() ?? "");
      expect(output).toContain("elapsed:");
      expect(output).toContain("0s");
      unmount();
    });
  });
});
