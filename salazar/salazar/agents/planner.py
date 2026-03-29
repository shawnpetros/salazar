"""Planner agent — decomposes app_spec.md into feature_list.json."""

import logging
from pathlib import Path

from claude_agent_sdk import query, ResultMessage

from salazar.client import make_options, OUTPUT_DIR

logger = logging.getLogger("harness.planner")

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "planner.md"


async def run_planner(app_spec_path: Path) -> bool:
    """Run the planner agent to create feature_list.json.

    Args:
        app_spec_path: Path to the app_spec.md file.

    Returns:
        True if feature_list.json was created successfully.
    """
    logger.info("[planner] Starting planner agent")

    # Read the system prompt and app spec
    system_prompt = PROMPT_PATH.read_text()
    app_spec = app_spec_path.read_text()

    # Copy app_spec into output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "app_spec.md").write_text(app_spec)

    prompt = (
        f"Here is the product specification. Decompose it into a comprehensive "
        f"feature list with BDD scenarios.\n\n"
        f"---\n\n{app_spec}"
    )

    options = make_options(
        system_prompt=system_prompt,
        role="planner",
        max_budget_usd=10.0,  # Planner is a one-shot — shouldn't cost much
    )

    import asyncio

    async def _run():
        nonlocal result_text
        async for message in query(prompt=prompt, options=options):
            if isinstance(message, ResultMessage):
                cost = message.total_cost_usd or 0.0
                logger.info(f"[planner] Session complete: cost=${cost:.4f}, turns={message.num_turns}")
                result_text = f"cost={cost:.4f}"

    result_text = ""
    try:
        await asyncio.wait_for(_run(), timeout=600)  # 10 min timeout
    except asyncio.TimeoutError:
        logger.error("[planner] Session timed out after 10 minutes")

    # Verify output
    feature_list = OUTPUT_DIR / "feature_list.json"
    if feature_list.exists():
        logger.info(f"[planner] Created feature_list.json ({feature_list.stat().st_size} bytes)")
        return True
    else:
        logger.error("[planner] feature_list.json was not created")
        return False
