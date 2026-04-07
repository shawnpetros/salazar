/**
 * SQLite storage layer for Salazar session data.
 *
 * Ports `salazar/salazar/storage.py` to TypeScript using better-sqlite3
 * (synchronous API — no async needed).
 *
 * All session data persists in ~/.salazar/salazar.db by default.
 */

import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { getDbPath } from "../lib/paths.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const _SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    spec_name TEXT,
    spec_description TEXT,
    state TEXT DEFAULT 'running',
    phase TEXT DEFAULT 'plan',
    mode TEXT DEFAULT 'greenfield',
    model_generator TEXT,
    model_evaluator TEXT,
    started_at TEXT,
    completed_at TEXT,
    total_cost REAL DEFAULT 0,
    cost_planner REAL DEFAULT 0,
    cost_generator REAL DEFAULT 0,
    cost_evaluator REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS features (
    session_id TEXT REFERENCES sessions(id),
    feature_id TEXT,
    description TEXT,
    complexity TEXT,
    passes INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    duration_ms INTEGER,
    evaluator_score REAL,
    evaluator_feedback TEXT,
    PRIMARY KEY (session_id, feature_id)
);

CREATE TABLE IF NOT EXISTS timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT REFERENCES sessions(id),
    timestamp TEXT,
    label TEXT,
    duration_ms INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT REFERENCES sessions(id),
    sha TEXT,
    message TEXT,
    files_changed INTEGER DEFAULT 0,
    timestamp TEXT
);

CREATE INDEX IF NOT EXISTS idx_features_session ON features(session_id);
CREATE INDEX IF NOT EXISTS idx_timeline_session ON timeline(session_id);
CREATE INDEX IF NOT EXISTS idx_commits_session ON commits(session_id);
`;

function _now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// SalazarDB
// ---------------------------------------------------------------------------

export class SalazarDB {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? getDbPath();
    const dir = dirname(resolvedPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(resolvedPath);
    this._initSchema();
  }

  private _initSchema(): void {
    this.db.exec(_SCHEMA);
  }

  // -- Sessions --

  createSession(
    sessionId: string,
    opts: {
      specName?: string;
      specDescription?: string;
      mode?: string;
      modelGenerator?: string;
      modelEvaluator?: string;
    }
  ): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO sessions
         (id, spec_name, spec_description, state, phase, mode,
          model_generator, model_evaluator, started_at)
         VALUES (?, ?, ?, 'running', 'plan', ?, ?, ?, ?)`
      )
      .run(
        sessionId,
        opts.specName ?? "",
        opts.specDescription ?? "",
        opts.mode ?? "greenfield",
        opts.modelGenerator ?? "",
        opts.modelEvaluator ?? "",
        _now()
      );
  }

  updateSessionState(sessionId: string, state: string, phase?: string): void {
    if (state === "complete" || state === "error") {
      this.db
        .prepare("UPDATE sessions SET state=?, phase=?, completed_at=? WHERE id=?")
        .run(state, phase ?? "", _now(), sessionId);
    } else {
      this.db
        .prepare("UPDATE sessions SET state=?, phase=? WHERE id=?")
        .run(state, phase ?? "", sessionId);
    }
  }

  updateSessionCost(
    sessionId: string,
    total: number,
    planner: number,
    generator: number,
    evaluator: number
  ): void {
    this.db
      .prepare(
        `UPDATE sessions SET total_cost=?, cost_planner=?,
         cost_generator=?, cost_evaluator=? WHERE id=?`
      )
      .run(total, planner, generator, evaluator, sessionId);
  }

  getSession(sessionId: string): Record<string, unknown> | null {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id=?").get(sessionId);
    return (row as Record<string, unknown>) ?? null;
  }

  getActiveSessions(): Record<string, unknown>[] {
    return this.db
      .prepare("SELECT * FROM sessions WHERE state='running' ORDER BY started_at DESC")
      .all() as Record<string, unknown>[];
  }

  getCompletedSessions(): Record<string, unknown>[] {
    return this.db
      .prepare("SELECT * FROM sessions WHERE state IN ('complete', 'error') ORDER BY completed_at DESC LIMIT 50")
      .all() as Record<string, unknown>[];
  }

  // -- Features --

  upsertFeature(
    sessionId: string,
    featureId: string,
    opts: {
      description?: string;
      complexity?: string;
      passes?: boolean;
      durationMs?: number;
      evaluatorScore?: number;
      evaluatorFeedback?: string;
    }
  ): void {
    const passes = opts.passes === true;
    this.db
      .prepare(
        `INSERT INTO features (session_id, feature_id, description, complexity,
         passes, completed_at, duration_ms, evaluator_score, evaluator_feedback)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id, feature_id) DO UPDATE SET
         passes=excluded.passes, completed_at=excluded.completed_at,
         duration_ms=excluded.duration_ms, evaluator_score=excluded.evaluator_score,
         evaluator_feedback=excluded.evaluator_feedback`
      )
      .run(
        sessionId,
        featureId,
        opts.description ?? "",
        opts.complexity ?? "moderate",
        passes ? 1 : 0,
        passes ? _now() : null,
        opts.durationMs ?? 0,
        opts.evaluatorScore ?? null,
        opts.evaluatorFeedback ?? ""
      );
  }

  bulkInsertFeatures(
    sessionId: string,
    features: Array<{ id?: string; description?: string; complexity?: string; passes?: boolean }>
  ): void {
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO features
       (session_id, feature_id, description, complexity, passes)
       VALUES (?, ?, ?, ?, ?)`
    );
    const insertMany = this.db.transaction(
      (items: typeof features) => {
        for (const f of items) {
          stmt.run(sessionId, f.id ?? "", f.description ?? "", f.complexity ?? "moderate", f.passes ? 1 : 0);
        }
      }
    );
    insertMany(features);
  }

  getFeatures(sessionId: string): Record<string, unknown>[] {
    return this.db
      .prepare("SELECT * FROM features WHERE session_id=? ORDER BY feature_id")
      .all(sessionId) as Record<string, unknown>[];
  }

  getFeatureSummary(sessionId: string): { total: number; passing: number } {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as total,
         SUM(CASE WHEN passes=1 THEN 1 ELSE 0 END) as passing
         FROM features WHERE session_id=?`
      )
      .get(sessionId) as { total: number; passing: number | null } | undefined;
    if (!row) return { total: 0, passing: 0 };
    return { total: row.total, passing: row.passing ?? 0 };
  }

  // -- Timeline --

  addTimelineEvent(sessionId: string, label: string, durationMs: number = 0): void {
    this.db
      .prepare("INSERT INTO timeline (session_id, timestamp, label, duration_ms) VALUES (?, ?, ?, ?)")
      .run(sessionId, _now(), label, durationMs);
  }

  getTimeline(sessionId: string): Record<string, unknown>[] {
    return this.db
      .prepare("SELECT * FROM timeline WHERE session_id=? ORDER BY id")
      .all(sessionId) as Record<string, unknown>[];
  }

  // -- Commits --

  addCommit(sessionId: string, sha: string, message: string, filesChanged: number = 0): void {
    this.db
      .prepare("INSERT INTO commits (session_id, sha, message, files_changed, timestamp) VALUES (?, ?, ?, ?, ?)")
      .run(sessionId, sha, message, filesChanged, _now());
  }

  getCommits(sessionId: string): Record<string, unknown>[] {
    return this.db
      .prepare("SELECT * FROM commits WHERE session_id=? ORDER BY id DESC LIMIT 20")
      .all(sessionId) as Record<string, unknown>[];
  }

  close(): void {
    this.db.close();
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _db: SalazarDB | null = null;

export function getDb(): SalazarDB {
  if (!_db) _db = new SalazarDB();
  return _db;
}
