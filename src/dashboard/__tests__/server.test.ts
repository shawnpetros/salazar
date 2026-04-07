import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";

/**
 * Integration tests for the dashboard HTTP server.
 *
 * Spins up a real server on a random port, hits the endpoints,
 * and verifies responses. Uses a temp SQLite DB so nothing persists.
 */

// Simple HTTP GET helper — no deps needed
function get(url: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    }).on("error", reject);
  });
}

describe("Dashboard server", () => {
  let tmpDir: string;
  let server: http.Server;
  let port: number;
  let baseUrl: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "salazar-dash-"));
    const dbPath = join(tmpDir, "test.db");

    // Override the DB path so the server uses our temp DB
    process.env.SALAZAR_HOME = tmpDir;

    // Seed the DB with test data
    const { SalazarDB } = await import("../../engine/storage.js");
    const db = new SalazarDB(dbPath);
    db.createSession("test-session-1", {
      specName: "my-spec",
      specDescription: "A test spec",
      modelGenerator: "claude-sonnet-4-6",
      modelEvaluator: "claude-sonnet-4-6",
    });
    db.upsertFeature("test-session-1", "F001", {
      description: "Init project",
      complexity: "setup",
      passes: true,
      durationMs: 5000,
    });
    db.addTimelineEvent("test-session-1", "Planner: 3 features", 2000);
    db.addCommit("test-session-1", "abc1234", "feat(F001): Init project", 3);
    db.close();

    // Import and start the server
    // We need to dynamically construct a server to get a random port
    const { createServer } = await import("node:http");
    const { SalazarDB: DB2 } = await import("../../engine/storage.js");
    const { getDashboardHtml } = await import("../html.js");

    const testDb = new DB2(dbPath);

    server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost`);
      res.setHeader("Access-Control-Allow-Origin", "*");

      if (url.pathname === "/api/sessions") {
        const active = testDb.getActiveSessions();
        const completed = testDb.getCompletedSessions();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ active, completed }));
      } else if (url.pathname.match(/^\/api\/sessions\/[^/]+$/)) {
        const id = decodeURIComponent(url.pathname.split("/").pop()!);
        const session = testDb.getSession(id);
        if (!session) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Session not found" }));
          return;
        }
        const features = testDb.getFeatures(id);
        const timeline = testDb.getTimeline(id);
        const commits = testDb.getCommits(id);
        const summary = testDb.getFeatureSummary(id);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ session, features, timeline, commits, summary }));
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(getDashboardHtml(0));
      }
    });

    // Listen on port 0 for a random available port
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          port = addr.port;
        }
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    delete process.env.SALAZAR_HOME;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("serves the HTML dashboard at /", async () => {
    const res = await get(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("Salazar Dashboard");
    expect(res.body).toContain("<!DOCTYPE html>");
  });

  it("returns session list from /api/sessions", async () => {
    const res = await get(`${baseUrl}/api/sessions`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");

    const data = JSON.parse(res.body);
    expect(data.active).toBeInstanceOf(Array);
    expect(data.completed).toBeInstanceOf(Array);
    expect(data.active.length).toBe(1);
    expect(data.active[0].id).toBe("test-session-1");
    expect(data.active[0].spec_name).toBe("my-spec");
  });

  it("returns session detail from /api/sessions/:id", async () => {
    const res = await get(`${baseUrl}/api/sessions/test-session-1`);
    expect(res.status).toBe(200);

    const data = JSON.parse(res.body);
    expect(data.session.id).toBe("test-session-1");
    expect(data.features).toHaveLength(1);
    expect(data.features[0].feature_id).toBe("F001");
    expect(data.timeline).toHaveLength(1);
    expect(data.commits).toHaveLength(1);
    expect(data.summary.total).toBe(1);
    expect(data.summary.passing).toBe(1);
  });

  it("returns 404 for unknown session ID", async () => {
    const res = await get(`${baseUrl}/api/sessions/nonexistent-id`);
    expect(res.status).toBe(404);

    const data = JSON.parse(res.body);
    expect(data.error).toBe("Session not found");
  });

  it("sets CORS headers", async () => {
    const res = await get(`${baseUrl}/api/sessions`);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });
});
