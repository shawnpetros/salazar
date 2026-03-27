"""Multi-orchestrator — runs multiple harness instances for monorepo architectures."""

import asyncio
import logging
import time
import uuid
from pathlib import Path

from harness.agents.architect import (
    run_architect,
    is_multi_service,
    get_parallel_groups,
    get_service_spec,
)
from harness.orchestrator import run_orchestrator
from harness.client import OUTPUT_DIR
from harness import dashboard

logger = logging.getLogger("harness.multi")


async def run_multi_orchestrator(app_spec_path: Path) -> None:
    """Top-level orchestrator that handles both single and multi-service architectures.

    1. Runs the architect agent to analyze the spec
    2. If single service → delegates to standard run_orchestrator
    3. If multi-service → runs harness instances per service, respecting dependency order
    """
    root_session = uuid.uuid4().hex[:12]
    logger.info(f"[multi] Starting multi-orchestrator session {root_session}")

    await dashboard.push_session_start(root_session)

    # Phase 0: Architecture analysis
    logger.info("[multi] Running architect agent...")
    await dashboard.push_phase_change(root_session, "plan", "Analyzing architecture")

    start = time.time()
    services = await run_architect(app_spec_path)
    arch_time = time.time() - start

    if services is None:
        logger.error("[multi] Architect failed — falling back to single orchestrator")
        await run_orchestrator(app_spec_path)
        return

    arch_type = services.get("architecture", "single")
    logger.info(f"[multi] Architecture decision: {arch_type} ({arch_time:.1f}s)")

    # Single service — just run the standard orchestrator
    if not is_multi_service(services):
        logger.info("[multi] Single service architecture — delegating to standard orchestrator")
        await run_orchestrator(app_spec_path)
        return

    # Multi-service — run harness instances per execution phase
    app_spec = app_spec_path.read_text()
    groups = get_parallel_groups(services)
    total_services = sum(len(g) for g in groups)

    logger.info(
        f"[multi] Multi-service build: {total_services} services "
        f"across {len(groups)} execution phases"
    )

    # Build shared contracts first (they're defined in services.json)
    shared_contracts = services.get("shared_contracts", [])
    if shared_contracts:
        logger.info(f"[multi] {len(shared_contracts)} shared contracts to establish")
        await _build_shared_contracts(services, root_session)

    # Execute phases sequentially, services within each phase in parallel
    completed_services = []
    for phase_idx, group in enumerate(groups):
        phase_names = [s["name"] for s in group]
        logger.info(
            f"[multi] Phase {phase_idx}: building {', '.join(phase_names)} "
            f"({'parallel' if len(group) > 1 else 'sequential'})"
        )

        await dashboard.push_phase_change(
            root_session,
            "generate",
            f"Phase {phase_idx}: {', '.join(phase_names)}",
        )

        if len(group) == 1:
            # Single service in this phase — run directly
            svc = group[0]
            await _run_service_harness(svc, services, app_spec, root_session)
            completed_services.append(svc["name"])
        else:
            # Multiple services — run in parallel
            tasks = [
                _run_service_harness(svc, services, app_spec, root_session)
                for svc in group
            ]
            await asyncio.gather(*tasks)
            completed_services.extend(s["name"] for s in group)

        # Run integration checkpoint if defined
        checkpoints = [
            cp for cp in services.get("integration_checkpoints", [])
            if cp.get("after_phase") == phase_idx
        ]
        for checkpoint in checkpoints:
            logger.info(f"[multi] Integration checkpoint: {checkpoint['test']}")
            # TODO: Run integration evaluator here
            # For now, just log it
            await dashboard.push_status(root_session, "timeline", {
                "timestamp": _now_iso(),
                "label": f"Checkpoint: {checkpoint['test'][:60]}",
                "duration": 0,
            })

    logger.info(f"[multi] All {total_services} services complete!")
    await dashboard.push_session_complete(root_session)


async def _run_service_harness(
    service: dict,
    services: dict,
    app_spec: str,
    root_session: str,
) -> None:
    """Run a harness instance for a single service."""
    name = service["name"]
    session_id = f"{root_session}-{name}"

    logger.info(f"[multi:{name}] Starting service harness")

    # Create service-specific output directory
    service_output = OUTPUT_DIR / service.get("entrypoint", name)
    service_output.mkdir(parents=True, exist_ok=True)

    # Write the focused spec for this service
    focused_spec = get_service_spec(services, service, app_spec)
    spec_path = service_output / "app_spec.md"
    spec_path.write_text(focused_spec)

    # Push timeline event
    await dashboard.push_status(root_session, "timeline", {
        "timestamp": _now_iso(),
        "label": f"Starting {name} ({service['type']})",
        "duration": 0,
    })

    start = time.time()

    try:
        # Run the standard orchestrator with the focused spec
        # Override the output dir to the service-specific directory
        import os
        old_output = os.environ.get("HARNESS_OUTPUT_OVERRIDE")
        os.environ["HARNESS_OUTPUT_OVERRIDE"] = str(service_output)

        await run_orchestrator(spec_path)

        if old_output:
            os.environ["HARNESS_OUTPUT_OVERRIDE"] = old_output
        else:
            os.environ.pop("HARNESS_OUTPUT_OVERRIDE", None)

    except Exception as e:
        logger.error(f"[multi:{name}] Service harness failed: {e}")

    elapsed_ms = int((time.time() - start) * 1000)
    logger.info(f"[multi:{name}] Service complete ({elapsed_ms / 1000:.0f}s)")

    await dashboard.push_status(root_session, "timeline", {
        "timestamp": _now_iso(),
        "label": f"{name} complete",
        "duration": elapsed_ms,
    })


async def _build_shared_contracts(services: dict, root_session: str) -> None:
    """Create shared contract files that services reference."""
    contracts = services.get("shared_contracts", [])

    for contract in contracts:
        path = OUTPUT_DIR / contract.get("path", f"shared/{contract['name']}.ts")
        path.parent.mkdir(parents=True, exist_ok=True)

        # The contract file is a placeholder — the first service that needs it
        # will populate it. We just create the directory structure.
        if not path.exists():
            path.write_text(
                f"// Shared contract: {contract['name']}\n"
                f"// {contract['description']}\n"
                f"// Consumed by: {', '.join(contract.get('consumed_by', []))}\n"
                f"//\n"
                f"// This file will be populated by the first service that implements these types.\n"
                f"// Other services should import from here.\n"
            )
            logger.info(f"[multi] Created contract placeholder: {path}")

    await dashboard.push_status(root_session, "timeline", {
        "timestamp": _now_iso(),
        "label": f"Created {len(contracts)} shared contracts",
        "duration": 0,
    })


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
