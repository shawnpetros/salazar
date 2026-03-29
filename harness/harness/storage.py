"""SQLite storage layer — replaces webhook pushes with direct writes.

All session data persists in ~/.salazar/salazar.db. Zero config,
zero external dependencies. The dashboard reads from this directly
(local mode) or a sync daemon pushes to Redis (remote mode).
"""

import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("harness.storage")

DEFAULT_DB_PATH = Path.home() / ".salazar" / "salazar.db"

_SCHEMA = """
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
"""


class SalazarDB:
    """SQLite storage for Salazar session data."""

    def __init__(self, db_path: Path | None = None):
        self.db_path = db_path or Path(os.environ.get("SALAZAR_DB", str(DEFAULT_DB_PATH)))
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _init_schema(self) -> None:
        with self._conn() as conn:
            conn.executescript(_SCHEMA)
            logger.info(f"[storage] Database ready at {self.db_path}")

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    # -- Sessions --

    def create_session(
        self,
        session_id: str,
        spec_name: str = "",
        spec_description: str = "",
        mode: str = "greenfield",
        model_generator: str = "",
        model_evaluator: str = "",
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO sessions
                   (id, spec_name, spec_description, state, phase, mode,
                    model_generator, model_evaluator, started_at)
                   VALUES (?, ?, ?, 'running', 'plan', ?, ?, ?, ?)""",
                (session_id, spec_name, spec_description, mode,
                 model_generator, model_evaluator, _now()),
            )
        logger.debug(f"[storage] Session {session_id} created")

    def update_session_state(self, session_id: str, state: str, phase: str = "") -> None:
        with self._conn() as conn:
            if state in ("complete", "error"):
                conn.execute(
                    "UPDATE sessions SET state=?, phase=?, completed_at=? WHERE id=?",
                    (state, phase, _now(), session_id),
                )
            else:
                conn.execute(
                    "UPDATE sessions SET state=?, phase=? WHERE id=?",
                    (state, phase, session_id),
                )

    def update_session_cost(
        self, session_id: str,
        total: float, planner: float, generator: float, evaluator: float,
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                """UPDATE sessions SET total_cost=?, cost_planner=?,
                   cost_generator=?, cost_evaluator=? WHERE id=?""",
                (total, planner, generator, evaluator, session_id),
            )

    def get_session(self, session_id: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
            return dict(row) if row else None

    def get_active_sessions(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM sessions WHERE state='running' ORDER BY started_at DESC"
            ).fetchall()
            return [dict(r) for r in rows]

    def get_completed_sessions(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM sessions WHERE state IN ('complete', 'error') ORDER BY completed_at DESC LIMIT 50"
            ).fetchall()
            return [dict(r) for r in rows]

    # -- Features --

    def upsert_feature(
        self, session_id: str, feature_id: str,
        description: str = "", complexity: str = "moderate",
        passes: bool = False, duration_ms: int = 0,
        evaluator_score: float | None = None,
        evaluator_feedback: str = "",
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                """INSERT INTO features (session_id, feature_id, description, complexity,
                   passes, completed_at, duration_ms, evaluator_score, evaluator_feedback)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(session_id, feature_id) DO UPDATE SET
                   passes=excluded.passes, completed_at=excluded.completed_at,
                   duration_ms=excluded.duration_ms, evaluator_score=excluded.evaluator_score,
                   evaluator_feedback=excluded.evaluator_feedback""",
                (session_id, feature_id, description, complexity,
                 1 if passes else 0, _now() if passes else None,
                 duration_ms, evaluator_score, evaluator_feedback),
            )

    def bulk_insert_features(self, session_id: str, features: list[dict]) -> None:
        with self._conn() as conn:
            for f in features:
                conn.execute(
                    """INSERT OR IGNORE INTO features
                       (session_id, feature_id, description, complexity, passes)
                       VALUES (?, ?, ?, ?, ?)""",
                    (session_id, f.get("id", ""), f.get("description", ""),
                     f.get("complexity", "moderate"), 1 if f.get("passes") else 0),
                )

    def get_features(self, session_id: str) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM features WHERE session_id=? ORDER BY feature_id",
                (session_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    def get_feature_summary(self, session_id: str) -> dict:
        with self._conn() as conn:
            row = conn.execute(
                """SELECT COUNT(*) as total,
                   SUM(CASE WHEN passes=1 THEN 1 ELSE 0 END) as passing
                   FROM features WHERE session_id=?""",
                (session_id,),
            ).fetchone()
            return {"total": row["total"], "passing": row["passing"]} if row else {"total": 0, "passing": 0}

    # -- Timeline --

    def add_timeline_event(self, session_id: str, label: str, duration_ms: int = 0) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO timeline (session_id, timestamp, label, duration_ms) VALUES (?, ?, ?, ?)",
                (session_id, _now(), label, duration_ms),
            )

    def get_timeline(self, session_id: str) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM timeline WHERE session_id=? ORDER BY id",
                (session_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    # -- Commits --

    def add_commit(self, session_id: str, sha: str, message: str, files_changed: int = 0) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO commits (session_id, sha, message, files_changed, timestamp) VALUES (?, ?, ?, ?, ?)",
                (session_id, sha, message, files_changed, _now()),
            )

    def get_commits(self, session_id: str) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM commits WHERE session_id=? ORDER BY id DESC LIMIT 20",
                (session_id,),
            ).fetchall()
            return [dict(r) for r in rows]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# Module-level singleton — lazy init
_db: SalazarDB | None = None


def get_db() -> SalazarDB:
    """Get or create the module-level database singleton."""
    global _db
    if _db is None:
        _db = SalazarDB()
    return _db
