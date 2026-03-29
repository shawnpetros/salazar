"""Push status updates to the monitoring dashboard."""

import os
import logging
from typing import Any

import httpx

logger = logging.getLogger("harness.dashboard")

_client: httpx.AsyncClient | None = None


def _get_url() -> str:
    return os.environ.get("DASHBOARD_URL", "")


def _get_secret() -> str:
    return os.environ.get("DASHBOARD_SECRET", "")


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=5.0)
    return _client


async def push_status(session_id: str, update_type: str, payload: dict[str, Any]) -> None:
    """Push a status update to the dashboard. Fire-and-forget — failures are logged, not raised."""
    dashboard_url = _get_url()
    if not dashboard_url:
        logger.debug("[dashboard] No DASHBOARD_URL configured, skipping push")
        return

    try:
        client = _get_client()
        resp = await client.post(
            f"{dashboard_url}/api/ingest",
            json={
                "sessionId": session_id,
                "type": update_type,
                "payload": payload,
            },
            headers={"Authorization": f"Bearer {_get_secret()}"},
        )
        if resp.status_code != 200:
            logger.warning(f"[dashboard] Push failed: {resp.status_code} {resp.text}")
        else:
            logger.debug(f"[dashboard] Pushed {update_type} for session {session_id}")
    except Exception as e:
        logger.warning(f"[dashboard] Push error: {e}")


_session_started_at: str | None = None


def _get_started_at() -> str:
    global _session_started_at
    if _session_started_at is None:
        from datetime import datetime, timezone
        _session_started_at = datetime.now(timezone.utc).isoformat()
    return _session_started_at


async def push_session_start(session_id: str) -> None:
    await push_status(session_id, "status", {
        "state": "running",
        "phase": "plan",
        "startedAt": _get_started_at(),
        "currentFeature": None,
    })


async def push_phase_change(session_id: str, phase: str, feature_name: str | None = None) -> None:
    await push_status(session_id, "status", {
        "state": "running",
        "phase": phase,
        "startedAt": _get_started_at(),
        "currentFeature": feature_name,
    })


async def push_feature_update(session_id: str, features: dict) -> None:
    await push_status(session_id, "features", features)


async def push_sprint(session_id: str, iteration: int, phase: str, feature_name: str, goal: str) -> None:
    await push_status(session_id, "sprint", {
        "iteration": iteration,
        "phase": phase,
        "featureName": feature_name,
        "goal": goal,
    })


async def push_commit(session_id: str, sha: str, message: str, files_changed: int) -> None:
    await push_status(session_id, "commits", {
        "sha": sha,
        "message": message,
        "filesChanged": files_changed,
    })


async def push_evaluator_result(
    session_id: str,
    score: float,
    feedback: str,
    dimension_scores: dict[str, float],
) -> None:
    await push_status(session_id, "evaluator", {
        "lastScore": score,
        "feedback": feedback,
        "dimensionScores": dimension_scores,
    })


async def push_cost(
    session_id: str,
    total_tokens: int,
    input_tokens: int,
    output_tokens: int,
    estimated_cost: float,
    by_agent: dict[str, float],
) -> None:
    await push_status(session_id, "cost", {
        "totalTokens": total_tokens,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "estimatedCost": estimated_cost,
        "byAgent": by_agent,
    })


async def push_session_complete(session_id: str) -> None:
    await push_status(session_id, "status", {
        "state": "complete",
        "phase": "done",
        "startedAt": _get_started_at(),
        "currentFeature": None,
    })


async def push_session_error(session_id: str, error: str) -> None:
    await push_status(session_id, "status", {
        "state": "error",
        "phase": "error",
        "startedAt": _get_started_at(),
        "currentFeature": None,
        "error": error,
    })


async def push_spec(session_id: str, name: str, description: str) -> None:
    """Push the spec card data — what we're building."""
    await push_status(session_id, "spec", {
        "name": name,
        "description": description,
    })


async def push_timeline_event(session_id: str, label: str, duration_ms: int = 0) -> None:
    """Push a timeline event (appended to array in dashboard)."""
    from datetime import datetime, timezone
    await push_status(session_id, "timeline", {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "label": label,
        "duration": duration_ms,
    })
