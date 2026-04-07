import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("SalazarDB", () => {
  let tmpDir: string;
  let db: any;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "salazar-db-"));
    const { SalazarDB } = await import("../storage.js");
    db = new SalazarDB(join(tmpDir, "test.db"));
  });
  afterEach(() => {
    db?.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a session and retrieves it", () => {
    db.createSession("test-001", { specName: "my-spec", modelGenerator: "claude-sonnet-4-6" });
    const session = db.getSession("test-001");
    expect(session).not.toBeNull();
    expect(session.spec_name).toBe("my-spec");
    expect(session.state).toBe("running");
  });

  it("updates session state", () => {
    db.createSession("test-002", {});
    db.updateSessionState("test-002", "complete", "done");
    const session = db.getSession("test-002");
    expect(session.state).toBe("complete");
    expect(session.completed_at).not.toBeNull();
  });

  it("upserts features", () => {
    db.createSession("test-003", {});
    db.upsertFeature("test-003", "F001", { description: "Init", complexity: "setup", passes: true, durationMs: 5000 });
    db.upsertFeature("test-003", "F002", { description: "Core", complexity: "moderate", passes: false });

    const features = db.getFeatures("test-003");
    expect(features).toHaveLength(2);

    const summary = db.getFeatureSummary("test-003");
    expect(summary.total).toBe(2);
    expect(summary.passing).toBe(1);
  });

  it("bulk inserts features", () => {
    db.createSession("test-004", {});
    db.bulkInsertFeatures("test-004", [
      { id: "F001", description: "A", complexity: "setup", passes: true },
      { id: "F002", description: "B", complexity: "moderate" },
      { id: "F003", description: "C" },
    ]);
    const features = db.getFeatures("test-004");
    expect(features).toHaveLength(3);
  });

  it("tracks timeline events", () => {
    db.createSession("test-005", {});
    db.addTimelineEvent("test-005", "Planner: 10 features", 5000);
    db.addTimelineEvent("test-005", "F001 passed", 3000);
    const timeline = db.getTimeline("test-005");
    expect(timeline).toHaveLength(2);
    expect(timeline[0].label).toBe("Planner: 10 features");
  });

  it("tracks commits", () => {
    db.createSession("test-006", {});
    db.addCommit("test-006", "abc1234", "feat(F001): init", 3);
    const commits = db.getCommits("test-006");
    expect(commits).toHaveLength(1);
    expect(commits[0].sha).toBe("abc1234");
  });

  it("lists active and completed sessions", () => {
    db.createSession("active-1", { specName: "spec-a" });
    db.createSession("active-2", { specName: "spec-b" });
    db.createSession("done-1", { specName: "spec-c" });
    db.updateSessionState("done-1", "complete", "done");

    expect(db.getActiveSessions()).toHaveLength(2);
    expect(db.getCompletedSessions()).toHaveLength(1);
  });
});
