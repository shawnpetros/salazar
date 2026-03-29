"""Generator agent — builds one feature per session."""

import asyncio
import json
import logging
from pathlib import Path

from claude_agent_sdk import query, ResultMessage

from salazar.client import make_options, OUTPUT_DIR
from salazar.progress import read_progress, format_progress_header

logger = logging.getLogger("harness.generator")

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "generator.md"


async def run_generator(feature: dict, evaluator_feedback: str | None = None) -> dict:
    """Run the generator agent to implement a single feature.

    Args:
        feature: The feature dict from feature_list.json.
        evaluator_feedback: If retrying, the evaluator's feedback from the previous attempt.

    Returns:
        Dict with: success (bool), cost_usd (float), error (str|None)
    """
    feature_id = feature.get("id", "unknown")
    description = feature.get("description", "no description")
    steps = feature.get("steps", [])

    logger.info(f"[generator] Starting feature {feature_id}: {description}")

    system_prompt = PROMPT_PATH.read_text()

    # Build the prompt
    progress = read_progress()
    progress_header = format_progress_header(progress) if progress else "No progress file yet.\n"

    steps_text = "\n".join(f"  - {s}" for s in steps) if steps else "  (no BDD steps defined)"

    prompt_parts = [
        progress_header,
        f"\n## Your Assignment\n\n",
        f"Implement feature **{feature_id}**: {description}\n\n",
        f"### BDD Scenario\n{steps_text}\n\n",
    ]

    if evaluator_feedback:
        prompt_parts.append(
            f"### Previous Evaluator Feedback (you must address these issues)\n\n"
            f"{evaluator_feedback}\n\n"
            f"Fix the issues identified above and ensure the feature passes evaluation.\n"
        )

    prompt_parts.append(
        "Implement this feature, write tests, verify everything passes, "
        "commit your changes, and update feature_list.json."
    )

    prompt = "".join(prompt_parts)

    options = make_options(
        system_prompt=system_prompt,
        role="generator",
        max_budget_usd=50.0,
    )

    cost_usd = 0.0
    error = None

    # 15 minute timeout per generator session — prevents infinite hangs
    # from interactive CLIs (create-next-app, shadcn init) or long npm installs
    SESSION_TIMEOUT = 900  # 15 minutes

    async def _run_session():
        nonlocal cost_usd
        async for message in query(prompt=prompt, options=options):
            if isinstance(message, ResultMessage):
                cost_usd = message.total_cost_usd or 0.0
                logger.info(f"[generator] Feature {feature_id} session complete: cost=${cost_usd:.4f}, turns={message.num_turns}")

    try:
        await asyncio.wait_for(_run_session(), timeout=SESSION_TIMEOUT)
    except asyncio.TimeoutError:
        error = f"Generator session timed out after {SESSION_TIMEOUT}s"
        logger.error(f"[generator] Feature {feature_id}: {error}")
    except Exception as e:
        error = str(e)
        logger.error(f"[generator] Feature {feature_id} failed: {error}")

    # Check if the feature was marked as passing
    updated_progress = read_progress()
    success = False
    if updated_progress:
        for f in updated_progress.items:
            if f.get("id") == feature_id and f.get("passes", False):
                success = True
                break

    return {
        "success": success,
        "cost_usd": cost_usd,
        "error": error,
    }
