"""Explorer agent — scans existing codebase for brownfield work."""

import json
import logging
from pathlib import Path

from claude_agent_sdk import query, ResultMessage

from salazar.client import make_options
from salazar.resources import read_prompt

logger = logging.getLogger("salazar.explorer")


async def run_explorer(cwd: Path, spec_path: Path | None = None) -> dict | None:
    """Run the explorer agent to assess an existing codebase.

    Args:
        cwd: The project directory to explore.
        spec_path: Optional spec file — helps assess gaps relative to planned work.

    Returns:
        Parsed validator_assessment.json dict, or None if explorer failed.
    """
    logger.info(f"[explorer] Scanning codebase at {cwd}")

    system_prompt = read_prompt("explorer.md")

    prompt_parts = [
        f"Explore the codebase in the current directory and produce "
        f"codebase_context.md and validator_assessment.json.\n\n"
    ]

    if spec_path and spec_path.exists():
        spec_text = spec_path.read_text()
        prompt_parts.append(
            f"The planned work is described in this spec — use it to assess "
            f"which gaps are critical vs low priority:\n\n"
            f"---\n\n{spec_text[:3000]}\n\n---\n"
        )

    prompt = "".join(prompt_parts)

    options = make_options(
        system_prompt=system_prompt,
        role="planner",
        max_budget_usd=5.0,
        max_turns=500,
    )
    # Override cwd to the target project (not output/)
    options.cwd = str(cwd)

    async for message in query(prompt=prompt, options=options):
        if isinstance(message, ResultMessage):
            cost = message.total_cost_usd or 0.0
            logger.info(f"[explorer] Scan complete: cost=${cost:.4f}, turns={message.num_turns}")

    # Read outputs
    assessment_path = cwd / "validator_assessment.json"
    context_path = cwd / "codebase_context.md"

    if context_path.exists():
        logger.info(f"[explorer] Created codebase_context.md ({context_path.stat().st_size} bytes)")
    else:
        logger.warning("[explorer] codebase_context.md was not created")

    if not assessment_path.exists():
        logger.error("[explorer] validator_assessment.json was not created")
        return None

    try:
        assessment = json.loads(assessment_path.read_text())
        hardening = assessment.get("hardening_needed", False)
        scope = assessment.get("hardening_scope", "none")
        gaps = len(assessment.get("gaps", []))
        logger.info(
            f"[explorer] Assessment: hardening={hardening} ({scope}), {gaps} gaps found"
        )
        return assessment
    except json.JSONDecodeError as e:
        logger.error(f"[explorer] Failed to parse validator_assessment.json: {e}")
        return None


def get_codebase_context(cwd: Path) -> str | None:
    """Read the codebase_context.md if it exists."""
    path = cwd / "codebase_context.md"
    if path.exists():
        return path.read_text()
    return None


def get_detected_validators(assessment: dict) -> list[dict]:
    """Extract validator commands from the assessment."""
    toolchain = assessment.get("toolchain", {})
    validators = []
    for name, info in toolchain.items():
        if isinstance(info, dict) and info.get("command") and info.get("status") != "missing":
            validators.append({
                "name": name,
                "command": info["command"],
                "status": info["status"],
            })
    return validators


def get_hardening_features(assessment: dict) -> list[dict]:
    """Generate hardening feature specs from the assessment gaps."""
    gaps = assessment.get("gaps", [])
    pre_existing = assessment.get("pre_existing_failures", [])
    features = []
    feature_num = 0

    # Fix pre-existing test failures first
    if pre_existing:
        feature_num += 1
        failures = ", ".join(f.get("test", "unknown") for f in pre_existing[:5])
        features.append({
            "id": f"H{feature_num:03d}",
            "category": "hardening",
            "description": f"Fix {len(pre_existing)} pre-existing test failures: {failures}",
            "complexity": "simple",
            "priority": 1,
            "steps": [
                f"Given {len(pre_existing)} tests are currently failing",
                "When I investigate and fix each failure",
                "Then all existing tests pass",
            ],
            "passes": False,
        })

    # Add tests for critical/high gaps
    for gap in gaps:
        severity = gap.get("severity", "low")
        if severity not in ("critical", "high"):
            continue

        feature_num += 1
        features.append({
            "id": f"H{feature_num:03d}",
            "category": "hardening",
            "description": gap.get("recommendation", gap.get("issue", "Address gap")),
            "complexity": "simple",
            "priority": 1 if severity == "critical" else 2,
            "steps": [
                f"Given {gap.get('issue', 'a gap exists')}",
                f"When I {gap.get('recommendation', 'address the gap')}",
                "Then the validator surface area covers the planned changes",
            ],
            "passes": False,
        })

    # Add missing toolchain scripts
    toolchain = assessment.get("toolchain", {})
    missing = [name for name, info in toolchain.items()
               if isinstance(info, dict) and info.get("status") == "missing"]
    if missing:
        feature_num += 1
        features.append({
            "id": f"H{feature_num:03d}",
            "category": "hardening",
            "description": f"Add missing toolchain scripts: {', '.join(missing)}",
            "complexity": "setup",
            "priority": 1,
            "steps": [
                f"Given package.json is missing scripts for: {', '.join(missing)}",
                "When I add the appropriate scripts using existing project dependencies",
                "Then all validator commands exist and can be run",
            ],
            "passes": False,
        })

    return features
