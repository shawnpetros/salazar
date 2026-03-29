"""Orchestrator — the main planner → generator → evaluator loop.

Supports both greenfield and brownfield modes:
- Greenfield: planner → generator (TDD) → validators → evaluator
- Brownfield: explorer → hardening → planner → generator (TDD) → validators → evaluator
"""

import asyncio
import json
import logging
import subprocess
import time
import uuid
from pathlib import Path

from harness.agents.planner import run_planner
from harness.agents.generator import run_generator
from harness.agents.evaluator import run_evaluator
from harness.client import OUTPUT_DIR
from harness.progress import read_progress, get_feature_summary, FEATURE_LIST_PATH, feature_list_path
from harness.validators import (
    run_all_validators, run_tests_only, all_passed, format_failures,
    detect_validators, capture_baseline, check_regression,
    ValidatorConfig, BaselineResult,
)
from harness import dashboard
from harness.storage import get_db

logger = logging.getLogger("harness.orchestrator")

# Retry limits
MAX_VALIDATOR_RETRIES = 3
MAX_EVALUATOR_RETRIES = 2
DELAY_BETWEEN_SESSIONS = 3  # seconds


def _git_commit_feature(feature_id: str, description: str, work_dir: Path | None = None) -> bool:
    """Commit all changes for a completed feature. Returns True if committed."""
    target = str(work_dir or OUTPUT_DIR)
    try:
        # Stage all changes
        subprocess.run(["git", "add", "-A"], cwd=target, capture_output=True, timeout=10)
        # Commit with feature ID
        msg = f"feat({feature_id}): {description}"
        result = subprocess.run(
            ["git", "commit", "-m", msg],
            cwd=target, capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            logger.info(f"[orchestrator] Committed: {msg}")
            return True
        else:
            # Nothing to commit (no changes)
            logger.debug(f"[orchestrator] Nothing to commit for {feature_id}")
            return False
    except Exception as e:
        logger.warning(f"[orchestrator] Git commit failed: {e}")
        return False


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


async def run_orchestrator(
    app_spec_path: Path,
    brownfield: bool = False,
    hardening: str = "auto",
) -> None:
    """Main orchestration loop.

    Greenfield:
    1. Run planner (if no feature_list.json)
    2. Loop: generator (TDD) → validators → evaluator → retry
    3. Complete

    Brownfield (when brownfield=True):
    0. Run explorer → assess validator surface area
    0b. Run hardening sprint if needed
    1-3. Same as greenfield but with baseline regression checks

    Args:
        app_spec_path: Path to the spec file.
        brownfield: If True, run explorer first and enable regression guards.
        hardening: "auto" | "minimal" | "thorough" | "skip"
    """
    session = HarnessSession(app_spec_path)
    logger.info(f"[orchestrator] Starting session {session.session_id}")

    await dashboard.push_session_start(session.session_id)

    # Extract spec name/description
    spec_name = app_spec_path.stem
    spec_desc = ""
    try:
        spec_text = app_spec_path.read_text()
        spec_lines = [l.strip() for l in spec_text.split("\n") if l.strip()]
        spec_name = spec_lines[0].lstrip("# ") if spec_lines else app_spec_path.stem
        spec_desc = next((l for l in spec_lines[1:] if not l.startswith("#") and not l.startswith("---")), "")
        await dashboard.push_spec(session.session_id, spec_name, spec_desc[:200])
    except Exception as e:
        logger.warning(f"[orchestrator] Could not push spec card: {e}")

    # Write to SQLite
    db = get_db()
    from harness.client import get_model_for_role
    db.create_session(
        session_id=session.session_id,
        spec_name=spec_name,
        spec_description=spec_desc[:500],
        mode="brownfield" if brownfield else "greenfield",
        model_generator=get_model_for_role("generator"),
        model_evaluator=get_model_for_role("evaluator"),
    )

    # In brownfield mode, work in the spec file's directory (the existing codebase)
    # In greenfield mode, work in OUTPUT_DIR (fresh directory)
    work_dir = app_spec_path.parent if brownfield else OUTPUT_DIR
    import os
    os.environ["HARNESS_SESSION_ID"] = session.session_id
    if brownfield:
        logger.info(f"[orchestrator] Brownfield target: {work_dir}")
        os.environ["HARNESS_WORK_DIR"] = str(work_dir)

    # Detect validators (auto-detect toolchain)
    validator_config = detect_validators(work_dir)
    baseline: BaselineResult | None = None

    try:
        # Phase 0 (brownfield only): Explorer + Hardening
        if brownfield:
            from harness.agents.explorer import run_explorer, get_hardening_features

            logger.info("[orchestrator] Brownfield mode — running explorer")
            await dashboard.push_phase_change(session.session_id, "plan", "Exploring codebase")

            explorer_start = time.time()
            assessment = await run_explorer(work_dir, app_spec_path)
            explorer_ms = int((time.time() - explorer_start) * 1000)

            if assessment:
                await dashboard.push_timeline_event(session.session_id, "Explorer: codebase scanned", explorer_ms)

                # Re-detect validators after explorer may have updated assessment
                validator_config = detect_validators(work_dir)

                # Capture baseline before any changes
                baseline = await capture_baseline(work_dir, validator_config)
                logger.info(f"[orchestrator] Baseline: {baseline.test_count} tests, passing={baseline.all_passing}")

                # Hardening sprint
                needs_hardening = assessment.get("hardening_needed", False)
                if needs_hardening and hardening != "skip":
                    scope = hardening if hardening != "auto" else assessment.get("hardening_scope", "targeted")
                    hardening_features = get_hardening_features(assessment)

                    if scope == "minimal":
                        hardening_features = [f for f in hardening_features if f.get("priority") == 1]
                    elif scope == "thorough":
                        pass  # Use all features

                    if hardening_features:
                        logger.info(f"[orchestrator] Hardening sprint: {len(hardening_features)} features ({scope})")
                        await dashboard.push_timeline_event(session.session_id, f"Hardening: {len(hardening_features)} features ({scope})")

                        # Write hardening features to feature_list.json temporarily
                        hardening_list = {"features": hardening_features}
                        feature_list_path(work_dir).write_text(json.dumps(hardening_list, indent=2))

                        # Run the hardening features through the normal loop (uses hardening prompt)
                        await _run_feature_loop(
                            session, validator_config, baseline,
                            use_hardening_prompt=True,
                        )

                        # Remove hardening feature_list so planner creates the real one
                        feature_list_path(work_dir).unlink(missing_ok=True)

                        # Re-capture baseline after hardening
                        baseline = await capture_baseline(work_dir, validator_config)
                        logger.info(f"[orchestrator] Post-hardening baseline: {baseline.test_count} tests")
            else:
                logger.warning("[orchestrator] Explorer failed — proceeding without assessment")

        # Phase 1: Planning
        # Check both session-scoped and root paths
        has_features = feature_list_path(work_dir).exists() or (work_dir / "feature_list.json").exists()
        if not has_features:
            logger.info("[orchestrator] No feature_list.json — running planner")
            await dashboard.push_phase_change(session.session_id, "plan")

            planner_start = time.time()
            success = await run_planner(app_spec_path)
            planner_ms = int((time.time() - planner_start) * 1000)
            if not success:
                await dashboard.push_session_error(session.session_id, "Planner failed to create feature_list.json")
                logger.error("[orchestrator] Planner failed — aborting")
                return

            progress = read_progress(work_dir)
            if progress:
                await dashboard.push_feature_update(session.session_id, get_feature_summary(progress))
                await dashboard.push_timeline_event(session.session_id, f"Planner: {progress.total} features", planner_ms)
                logger.info(f"[orchestrator] Planner created {progress.total} features")

                # Write features to SQLite
                db = get_db()
                db.bulk_insert_features(session.session_id, progress.items)
                db.add_timeline_event(session.session_id, f"Planner: {progress.total} features", planner_ms)

        # Phase 2: Build loop
        await _run_feature_loop(session, validator_config, baseline, work_dir=work_dir)

    except KeyboardInterrupt:
        logger.info("[orchestrator] Interrupted by user")
        await dashboard.push_status(session.session_id, "status", {
            "state": "paused",
            "phase": "interrupted",
            "startedAt": dashboard._get_started_at(),
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


async def _run_feature_loop(
    session: HarnessSession,
    validator_config: ValidatorConfig | None = None,
    baseline: BaselineResult | None = None,
    use_hardening_prompt: bool = False,
    work_dir: Path | None = None,
) -> None:
    """The core feature loop — shared between main build and hardening sprint."""
    while True:
        progress = read_progress(work_dir)
        if progress is None:
            logger.error("[orchestrator] Cannot read feature_list.json")
            await dashboard.push_session_error(session.session_id, "Cannot read feature_list.json")
            return

        if progress.is_complete:
            logger.info(f"[orchestrator] All {progress.total} features complete!")
            await dashboard.push_session_complete(session.session_id)
            get_db().update_session_state(session.session_id, "complete", "done")
            return

        feature = progress.next_incomplete()
        if feature is None:
            logger.info("[orchestrator] No more incomplete features — done")
            await dashboard.push_session_complete(session.session_id)
            get_db().update_session_state(session.session_id, "complete", "done")
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
        skip_evaluator = complexity in ("setup", "simple") or use_hardening_prompt
        max_eval_retries = 0 if skip_evaluator else MAX_EVALUATOR_RETRIES

        if skip_evaluator:
            logger.info(f"[orchestrator] Feature {feature_id} is {complexity} — skipping evaluator")

        # Generator loop with validator retries
        evaluator_feedback = None
        feature_complete = False

        for eval_attempt in range(max_eval_retries + 1):
            # Run generator (TDD: it writes test first, then implements)
            await dashboard.push_phase_change(session.session_id, "generate", feature_name)

            gen_result = await run_generator(feature, evaluator_feedback)
            session.total_cost += gen_result.get("cost_usd", 0)
            session.cost_by_agent["generator"] += gen_result.get("cost_usd", 0)

            if gen_result.get("error"):
                logger.error(f"[orchestrator] Generator error: {gen_result['error']}")
                break

            # Run hard validators with retries
            # Re-detect validators each time (first feature may create package.json)
            validator_config = detect_validators(work_dir or OUTPUT_DIR)
            await dashboard.push_phase_change(session.session_id, "validate", feature_name)

            validator_passed = False
            for val_attempt in range(MAX_VALIDATOR_RETRIES):
                results = await run_all_validators(cwd=work_dir, config=validator_config)
                if all_passed(results):
                    # Brownfield: also check for regressions
                    if baseline:
                        reg_ok, reg_msg = await check_regression(baseline, cwd=work_dir, config=validator_config)
                        if not reg_ok:
                            logger.warning(f"[orchestrator] Regression detected: {reg_msg}")
                            results.append(ValidationResult(
                                name="regression", passed=False, output=reg_msg,
                            ))
                        else:
                            validator_passed = True
                            break
                    else:
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

            # Skip evaluator for setup/simple/hardening features
            if skip_evaluator:
                feature_elapsed_ms = int((time.time() - feature_start_time) * 1000)
                logger.info(f"[orchestrator] Feature {feature_id} PASSED (validators only, {complexity})")
                feature_complete = True
                _git_commit_feature(feature_id, feature_name, work_dir)
                get_db().upsert_feature(
                    session.session_id, feature_id, feature_name, complexity,
                    passes=True, duration_ms=feature_elapsed_ms,
                )
                await dashboard.push_timeline_event(
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
                _git_commit_feature(feature_id, feature_name, work_dir)
                get_db().upsert_feature(
                    session.session_id, feature_id, feature_name, complexity,
                    passes=True, duration_ms=feature_elapsed_ms,
                    evaluator_score=eval_result["score"],
                    evaluator_feedback=eval_result.get("feedback", ""),
                )
                await dashboard.push_timeline_event(
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
        updated_progress = read_progress(work_dir)
        if updated_progress:
            await dashboard.push_feature_update(
                session.session_id,
                get_feature_summary(updated_progress),
            )

        # Push cost update
        await dashboard.push_cost(
            session.session_id,
            total_tokens=0,
            input_tokens=0,
            output_tokens=0,
            estimated_cost=session.total_cost,
            by_agent=session.cost_by_agent,
        )

        # SQLite cost update
        get_db().update_session_cost(
            session.session_id,
            session.total_cost,
            session.cost_by_agent["planner"],
            session.cost_by_agent["generator"],
            session.cost_by_agent["evaluator"],
        )

        if not feature_complete:
            logger.error(f"[orchestrator] Feature {feature_id} FAILED after all retries")

            # Rollback: revert any uncommitted changes from the failed feature
            try:
                rollback_result = subprocess.run(
                    ["git", "checkout", "."],
                    cwd=str(work_dir or OUTPUT_DIR),
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if rollback_result.returncode == 0:
                    logger.info(f"[orchestrator] Rolled back uncommitted changes from {feature_id}")
                    await dashboard.push_timeline_event(
                        session.session_id,
                        f"{feature_id} FAILED — rolled back",
                    )
                else:
                    logger.warning(f"[orchestrator] Rollback failed: {rollback_result.stderr}")
            except Exception as e:
                logger.warning(f"[orchestrator] Rollback error: {e}")

            # In brownfield mode, stop on failure — don't leave a broken codebase
            if work_dir and work_dir != OUTPUT_DIR:
                logger.error(f"[orchestrator] Brownfield mode — stopping run. Failed feature: {feature_id}")
                await dashboard.push_session_error(
                    session.session_id,
                    f"Feature {feature_id} failed after all retries. Rolled back changes.",
                )
                return

        # Brief delay between sessions
        logger.debug(f"[orchestrator] Waiting {DELAY_BETWEEN_SESSIONS}s before next feature")
        await asyncio.sleep(DELAY_BETWEEN_SESSIONS)
