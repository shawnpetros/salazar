/**
 * Local dashboard HTTP server — reads from SQLite, serves a single-page UI.
 *
 * Uses node:http only. No express, no hono, no external deps.
 *
 * API routes:
 *   GET /                    -> HTML dashboard
 *   GET /api/sessions        -> list all sessions (active + completed)
 *   GET /api/sessions/:id    -> session detail with features, timeline, commits
 *   GET /api/live            -> SSE stream (polls SQLite every 2s, pushes diffs)
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { SalazarDB } from "../engine/storage.js";
import { getDbPath } from "../lib/paths.js";
import { getDashboardHtml } from "./html.js";

// ---------------------------------------------------------------------------
// SSE
// ---------------------------------------------------------------------------

const sseClients: Set<ServerResponse> = new Set();

/**
 * Push an event to all connected SSE clients.
 * Called externally (or from the poll loop) — fire and forget.
 */
export function pushEvent(event: Record<string, unknown>): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      // Client disconnected — will be cleaned up on close event
    }
  }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export function startDashboard(opts: {
  port?: number;
  host?: string;
  open?: boolean;
}): void {
  const port = opts.port ?? 3274;
  const host = opts.host ?? "localhost";

  let db: SalazarDB;
  try {
    db = new SalazarDB(getDbPath());
  } catch (err) {
    console.error(`[dashboard] Failed to open database: ${err}`);
    process.exit(1);
  }

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);

    // CORS for local dev
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // ---- API: session list ----
    if (url.pathname === "/api/sessions") {
      try {
        const active = db.getActiveSessions();
        const completed = db.getCompletedSessions();
        jsonResponse(res, 200, { active, completed });
      } catch (err) {
        console.error(`[dashboard] /api/sessions error: ${err}`);
        jsonResponse(res, 500, { error: "Failed to query sessions" });
      }
      return;
    }

    // ---- API: session detail ----
    const detailMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (detailMatch) {
      const id = decodeURIComponent(detailMatch[1]);
      try {
        const session = db.getSession(id);
        if (!session) {
          jsonResponse(res, 404, { error: "Session not found" });
          return;
        }
        const features = db.getFeatures(id);
        const timeline = db.getTimeline(id);
        const commits = db.getCommits(id);
        const summary = db.getFeatureSummary(id);
        jsonResponse(res, 200, { session, features, timeline, commits, summary });
      } catch (err) {
        console.error(`[dashboard] /api/sessions/${id} error: ${err}`);
        jsonResponse(res, 500, { error: "Failed to query session" });
      }
      return;
    }

    // ---- SSE: live updates ----
    if (url.pathname === "/api/live") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Send an initial ping so the client knows the connection is live
      res.write("data: {\"type\":\"connected\"}\n\n");
      sseClients.add(res);

      // Poll SQLite every 2 seconds and push active session data
      const interval = setInterval(() => {
        try {
          const active = db.getActiveSessions();
          if (active.length > 0) {
            const session = active[0] as Record<string, unknown>;
            const id = session.id as string;
            const features = db.getFeatures(id);
            const timeline = db.getTimeline(id);
            const summary = db.getFeatureSummary(id);
            const payload = JSON.stringify({ session, features, timeline, summary });
            res.write(`data: ${payload}\n\n`);
          }
        } catch {
          // DB read failed — skip this tick
        }
      }, 2000);

      req.on("close", () => {
        clearInterval(interval);
        sseClients.delete(res);
      });
      return;
    }

    // ---- Fallback: serve the HTML dashboard ----
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(getDashboardHtml(port));
  });

  server.listen(port, host, () => {
    const url = `http://${host}:${port}`;
    console.log(`[dashboard] Salazar dashboard running at ${url}`);

    if (opts.open !== false) {
      import("node:child_process")
        .then((cp) => {
          // macOS: open. Linux: xdg-open. Windows: start.
          const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
          cp.execSync(`${cmd} ${url}`, { stdio: "ignore" });
        })
        .catch(() => {
          // Browser open failed — no big deal, URL is logged above
        });
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[dashboard] Port ${port} is already in use. Try --port <number>`);
    } else {
      console.error(`[dashboard] Server error: ${err.message}`);
    }
    process.exit(1);
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
