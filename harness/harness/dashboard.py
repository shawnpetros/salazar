"""Push status updates to the monitoring dashboard."""

import os
import logging
from typing import Any

import httpx

logger = logging.getLogger("harness.dashboard")

DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "")
INGEST_SECRET = os.environ.get("DASHBOARD_SECRET", "")

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=5.0)
    return _client


async def push_status(session_id: str, update_type: str, payload: dict[str, Any]) -> None:
    """Push a status update to the dashboard. Fire-and-forget — failures are logged, not raised."""
    if not DASHBOARD_URL:
        logger.debug("[dashboard] No DASHBOARD_URL configured, skipping push")
        return

    try:
        client = _get_client()
        resp = await client.post(
            f"{DASHBOARD_URL}/api/ingest",
            json={
                "sessionId": session_id,
                "type": update_type,
                "payload": payload,
            },
            headers={"Authorization": f"Bearer {INGEST_SECRET}"},
        )
        if resp.status_code != 200:
            logger.warning(f"[dashboard] Push failed: {resp.status_code} {resp.text}")
        else:
            logger.debug(f"[dashboard] Pushed {update_type} for session {session_id}")
    except Exception as e:
        logger.warning(f"[dashboard] Push error: {e}")


async def push_session_start(session_id: str) -> None:
    await push_status(session_id, "status", {
        "state": "running",
        "phase": "plan",
        "currentFeature": None,
    })


async def push_phase_change(session_id: str, phase: str, feature_name: str | None = None) -> None:
    await push_status(session_id, "status", {
        "state": "running",
        "phase": phase,
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
    await push_status(session_id, "commit", {
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
        "currentFeature": None,
    })


async def push_session_error(session_id: str, error: str) -> None:
    await push_status(session_id, "status", {
        "state": "error",
        "phase": "error",
        "currentFeature": None,
        "error": error,
    })
