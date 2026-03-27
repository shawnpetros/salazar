"""Orchestrator — the main planner → generator → evaluator loop."""

import asyncio
import logging
import subprocess
import time
import uuid
from pathlib import Path

from harness.agents.planner import run_planner
from harness.agents.generator import run_generator
from harness.agents.evaluator import run_evaluator
from harness.client import OUTPUT_DIR
from harness.progress import read_progress, get_feature_summary, FEATURE_LIST_PATH
from harness.validators import run_all_validators, all_passed, format_failures
from harness import dashboard

logger = logging.getLogger("harness.orchestrator")

# Retry limits
MAX_VALIDATOR_RETRIES = 3
MAX_EVALUATOR_RETRIES = 2
DELAY_BETWEEN_SESSIONS = 3  # seconds


async def push_git_commits(session_id: str) -> None:
    """Read recent git commits from output dir and push to dashboard."""
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "--format=%H|%s|%aI", "-10"],
            cwd=str(OUTPUT_DIR),
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode != 0:
            return

        for line in result.stdout.strip().split("\n"):
            if not line or "|" not in line:
                continue
            parts = line.split("|", 2)
            if len(parts) < 3:
                continue
            sha, message, timestamp = parts

            # Count files changed in this commit
            diff_result = subprocess.run(
                ["git", "diff", "--name-only", f"{sha}~1", sha],
                cwd=str(OUTPUT_DIR),
                capture_output=True,
                text=True,
                timeout=5,
            )
            files_changed = len([l for l in diff_result.stdout.strip().split("\n") if l]) if diff_result.returncode == 0 else 0

            await dashboard.push_commit(session_id, sha[:7], message, files_changed)
    except Exception as e:
        logger.warning(f"[orchestrator] Failed to push git commits: {e}")


async def push_timeline_event(session_id: str, label: str, duration_ms: int = 0) -> None:
    """Push a timeline event to the dashboard."""
    from datetime import datetime, timezone
    await dashboard.push_status(session_id, "timeline", {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "label": label,
        "duration": duration_ms,
    })


class HarnessSession:
    """Tracks state for a single harness run."""

    def __init__(self, app_spec_path: Path):
        self.session_id = uuid.uuid4().hex[:12]
        self.app_spec_path = app_spec_path
        self.start_time = time.time()
        self.iteration = 0
        self.total_cost = 0.0
        self.cost_by_agent = {"planner": 0.0, "generator": 0.0, "evaluator": 0.0}

    @property
    def elapsed_seconds(self) -> int:
        return int(time.time() - self.start_time)


async def run_orchestrator(app_spec_path: Path) -> None:
    """Main orchestration loop.

    1. Run planner (if no feature_list.json)
    2. Loop over features:
       a. Generator builds
       b. Hard validators check
       c. Evaluator reviews
       d. Retry on failure
    3. Complete
    """
    session = HarnessSession(app_spec_path)
    logger.info(f"[orchestrator] Starting session {session.session_id}")

    await dashboard.push_session_start(session.session_id)

    try:
        # Phase 1: Planning
        if not FEATURE_LIST_PATH.exists():
            logger.info("[orchestrator] No feature_list.json — running planner")
            await dashboard.push_phase_change(session.session_id, "plan")

            planner_start = time.time()
            success = await run_planner(app_spec_path)
            planner_ms = int((time.time() - planner_start) * 1000)
            if not success:
                await dashboard.push_session_error(session.session_id, "Planner failed to create feature_list.json")
                logger.error("[orchestrator] Planner failed — aborting")
                return

            progress = read_progress()
            if progress:
                await dashboard.push_feature_update(session.session_id, get_feature_summary(progress))
                await push_timeline_event(session.session_id, f"Planner: {progress.total} features", planner_ms)
                logger.info(f"[orchestrator] Planner created {progress.total} features")

        # Phase 2: Build loop
        while True:
            progress = read_progress()
            if progress is None:
                logger.error("[orchestrator] Cannot read feature_list.json")
                await dashboard.push_session_error(session.session_id, "Cannot read feature_list.json")
                return

            if progress.is_complete:
                logger.info(f"[orchestrator] All {progress.total} features complete!")
                await dashboard.push_session_complete(session.session_id)
                return

            feature = progress.next_incomplete()
            if feature is None:
                logger.info("[orchestrator] No more incomplete features — done")
                await dashboard.push_session_complete(session.session_id)
                return

            session.iteration += 1
            feature_id = feature.get("id", "unknown")
            feature_name = feature.get("description", "unnamed")
            feature_start_time = time.time()

            logger.info(
                f"[orchestrator] Iteration {session.iteration}: "
                f"feature {feature_id} ({progress.passing}/{progress.total} done)"
            )

            await dashboard.push_sprint(
                session.session_id,
                session.iteration,
                "generate",
                feature_name,
                f"Implementing {feature_id}",
            )

            # Determine complexity tier
            complexity = feature.get("complexity", "moderate")
            skip_evaluator = complexity in ("setup", "simple")
            max_eval_retries = 0 if skip_evaluator else MAX_EVALUATOR_RETRIES

            if skip_evaluator:
                logger.info(f"[orchestrator] Feature {feature_id} is {complexity} — skipping evaluator")

            # Generator loop with validator retries
            evaluator_feedback = None
            feature_complete = False

            for eval_attempt in range(max_eval_retries + 1):
                # Run generator
                await dashboard.push_phase_change(session.session_id, "generate", feature_name)

                gen_result = await run_generator(feature, evaluator_feedback)
                session.total_cost += gen_result.get("cost_usd", 0)
                session.cost_by_agent["generator"] += gen_result.get("cost_usd", 0)

                if gen_result.get("error"):
                    logger.error(f"[orchestrator] Generator error: {gen_result['error']}")
                    break

                # Run hard validators with retries
                await dashboard.push_phase_change(session.session_id, "validate", feature_name)

                validator_passed = False
                for val_attempt in range(MAX_VALIDATOR_RETRIES):
                    results = await run_all_validators()
                    if all_passed(results):
                        validator_passed = True
                        break

                    logger.warning(
                        f"[orchestrator] Validators failed (attempt {val_attempt + 1}/{MAX_VALIDATOR_RETRIES})"
                    )

                    if val_attempt < MAX_VALIDATOR_RETRIES - 1:
                        failures_text = format_failures(results)
                        evaluator_feedback = f"VALIDATOR FAILURES:\n{failures_text}"
                        gen_result = await run_generator(feature, evaluator_feedback)
                        session.total_cost += gen_result.get("cost_usd", 0)
                        session.cost_by_agent["generator"] += gen_result.get("cost_usd", 0)

                if not validator_passed:
                    logger.error(f"[orchestrator] Feature {feature_id}: validators failed after {MAX_VALIDATOR_RETRIES} attempts")
                    break

                # Skip evaluator for setup/simple features — validators are enough
                if skip_evaluator:
                    feature_elapsed_ms = int((time.time() - feature_start_time) * 1000)
                    logger.info(f"[orchestrator] Feature {feature_id} PASSED (validators only, {complexity})")
                    feature_complete = True
                    await push_timeline_event(
                        session.session_id,
                        f"{feature_id} passed (validators, {complexity})",
                        feature_elapsed_ms,
                    )
                    await push_git_commits(session.session_id)
                    break

                # Run evaluator for moderate/complex features
                await dashboard.push_phase_change(session.session_id, "evaluate", feature_name)

                eval_result = await run_evaluator(feature)
                session.total_cost += eval_result.get("cost_usd", 0)
                session.cost_by_agent["evaluator"] += eval_result.get("cost_usd", 0)

                await dashboard.push_evaluator_result(
                    session.session_id,
                    eval_result["score"],
                    eval_result["feedback"],
                    eval_result["dimensionScores"],
                )

                if eval_result["passed"]:
                    feature_elapsed_ms = int((time.time() - feature_start_time) * 1000)
                    logger.info(f"[orchestrator] Feature {feature_id} PASSED (score: {eval_result['score']})")
                    feature_complete = True
                    await push_timeline_event(
                        session.session_id,
                        f"{feature_id} passed ({eval_result['score']}/10)",
                        feature_elapsed_ms,
                    )
                    await push_git_commits(session.session_id)
                    break
                else:
                    logger.warning(
                        f"[orchestrator] Feature {feature_id} FAILED evaluation "
                        f"(score: {eval_result['score']}, attempt {eval_attempt + 1}/{max_eval_retries + 1})"
                    )
                    evaluator_feedback = eval_result["feedback"]

            # Update dashboard with feature progress
            updated_progress = read_progress()
            if updated_progress:
                await dashboard.push_feature_update(
                    session.session_id,
                    get_feature_summary(updated_progress),
                )

            # Push cost update
            await dashboard.push_cost(
                session.session_id,
                total_tokens=0,  # SDK doesn't expose token counts directly
                input_tokens=0,
                output_tokens=0,
                estimated_cost=session.total_cost,
                by_agent=session.cost_by_agent,
            )

            if not feature_complete:
                logger.warning(f"[orchestrator] Feature {feature_id} could not be completed — skipping")

            # Brief delay between sessions
            logger.debug(f"[orchestrator] Waiting {DELAY_BETWEEN_SESSIONS}s before next feature")
            await asyncio.sleep(DELAY_BETWEEN_SESSIONS)

    except KeyboardInterrupt:
        logger.info("[orchestrator] Interrupted by user")
        await dashboard.push_status(session.session_id, "status", {
            "state": "paused",
            "phase": "interrupted",
            "currentFeature": None,
        })
    except Exception as e:
        logger.error(f"[orchestrator] Fatal error: {e}", exc_info=True)
        await dashboard.push_session_error(session.session_id, str(e))
        raise
    finally:
        elapsed = session.elapsed_seconds
        logger.info(
            f"[orchestrator] Session {session.session_id} finished in {elapsed}s, "
            f"total cost: ${session.total_cost:.2f}"
        )
