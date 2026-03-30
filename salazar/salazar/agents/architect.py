"""Architect agent — analyzes spec and determines project structure."""

import json
import logging
from pathlib import Path

from claude_agent_sdk import query, ResultMessage

from salazar.client import make_options, OUTPUT_DIR

logger = logging.getLogger("salazar.architect")

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "architect.md"


async def run_architect(app_spec_path: Path) -> dict | None:
    """Run the architect agent to determine project structure.

    Args:
        app_spec_path: Path to the app_spec.md file.

    Returns:
        Parsed services.json dict, or None if the architect failed.
    """
    logger.info("[architect] Starting architect agent")

    system_prompt = PROMPT_PATH.read_text()
    app_spec = app_spec_path.read_text()

    # Copy app_spec into output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "app_spec.md").write_text(app_spec)

    prompt = (
        f"Analyze this product specification and determine the optimal project structure.\n\n"
        f"---\n\n{app_spec}"
    )

    options = make_options(
        system_prompt=system_prompt,
        role="planner",  # Uses planner model tier — this is a planning task
        max_budget_usd=5.0,
        max_turns=500,
    )

    async for message in query(prompt=prompt, options=options):
        if isinstance(message, ResultMessage):
            cost = message.total_cost_usd or 0.0
            logger.info(f"[architect] Session complete: cost=${cost:.4f}, turns={message.num_turns}")

    # Read the output
    services_path = OUTPUT_DIR / "services.json"
    if not services_path.exists():
        logger.error("[architect] services.json was not created")
        return None

    try:
        services = json.loads(services_path.read_text())
        arch = services.get("architecture", "unknown")
        num_services = len(services.get("services", []))
        num_phases = len(services.get("execution_order", []))
        logger.info(
            f"[architect] Architecture: {arch}, "
            f"{num_services} services, {num_phases} execution phases"
        )
        return services
    except json.JSONDecodeError as e:
        logger.error(f"[architect] Failed to parse services.json: {e}")
        return None


def is_multi_service(services: dict) -> bool:
    """Check if the architect determined a multi-service architecture."""
    return services.get("architecture") in ("workspace", "monorepo")


def get_parallel_groups(services: dict) -> list[list[dict]]:
    """Group services by parallel execution phase.

    Returns a list of lists — each inner list contains services
    that can run simultaneously.
    """
    execution_order = services.get("execution_order", [])
    service_map = {s["name"]: s for s in services.get("services", [])}

    groups = []
    for phase in sorted(execution_order, key=lambda p: p.get("phase", 0)):
        group = []
        for name in phase.get("services", []):
            if name in service_map:
                group.append(service_map[name])
        if group:
            groups.append(group)

    return groups


def get_service_spec(services: dict, service: dict, app_spec: str) -> str:
    """Generate a focused spec for a single service.

    Takes the full app_spec and narrows it to just what this service
    needs, plus its shared contracts.
    """
    contracts = services.get("shared_contracts", [])
    relevant_contracts = [
        c for c in contracts
        if service["name"] in c.get("consumed_by", [])
    ]

    contract_section = ""
    if relevant_contracts:
        contract_names = ", ".join(c["name"] for c in relevant_contracts)
        contract_section = (
            f"\n\n## Shared Contracts\n\n"
            f"This service depends on these shared type definitions: {contract_names}\n"
            f"These are defined in the workspace and available as imports.\n"
        )

    return (
        f"# Service: {service['name']}\n\n"
        f"**Type:** {service['type']}\n"
        f"**Description:** {service['description']}\n"
        f"**Entrypoint:** {service['entrypoint']}\n"
        f"**Dependencies:** {', '.join(service.get('dependencies', [])) or 'None'}\n"
        f"**Estimated complexity:** {service.get('estimated_complexity', 'medium')}\n"
        f"{contract_section}\n"
        f"---\n\n"
        f"## Full Product Specification (for reference)\n\n"
        f"{app_spec}\n\n"
        f"---\n\n"
        f"**IMPORTANT:** You are only building the `{service['name']}` service. "
        f"Do not implement other services. Focus exclusively on the functionality "
        f"described for this service in the spec above.\n"
    )
