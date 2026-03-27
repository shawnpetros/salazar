"""Entry point for the agent-id harness."""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from harness.multi_orchestrator import run_multi_orchestrator
from harness.orchestrator import run_orchestrator


def setup_logging(verbose: bool = False, log_file: str | None = None) -> None:
    """Configure structured logging to stderr and optionally to a file."""
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"

    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stderr)]

    if log_file:
        file_handler = logging.FileHandler(log_file, mode="a")
        file_handler.setFormatter(logging.Formatter(fmt))
        handlers.append(file_handler)

    logging.basicConfig(level=level, format=fmt, handlers=handlers)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Agent-ID Harness — Autonomous coding orchestrator",
    )
    parser.add_argument(
        "spec",
        type=Path,
        help="Path to the app_spec.md file",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    parser.add_argument(
        "--single",
        action="store_true",
        help="Skip architect agent — run as single service (bypass monorepo detection)",
    )
    parser.add_argument(
        "--dashboard-url",
        type=str,
        default="",
        help="URL of the monitoring dashboard (e.g., https://agent-id.vercel.app)",
    )
    parser.add_argument(
        "--dashboard-secret",
        type=str,
        default="",
        help="Bearer token for dashboard ingest endpoint",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="claude-sonnet-4-6",
        help="Default model for all agent roles (default: claude-sonnet-4-6)",
    )
    parser.add_argument(
        "--model-planner",
        type=str,
        default=None,
        help="Model for planner agent (overrides --model)",
    )
    parser.add_argument(
        "--model-generator",
        type=str,
        default=None,
        help="Model for generator agent (overrides --model)",
    )
    parser.add_argument(
        "--model-evaluator",
        type=str,
        default=None,
        help="Model for evaluator agent (overrides --model). Use opus for production runs.",
    )
    parser.add_argument(
        "--log-file",
        type=str,
        default=None,
        help="Path to log file (in addition to stderr). Default: harness-{timestamp}.log",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Default log file if not specified
    import os
    from datetime import datetime
    log_file = args.log_file
    if log_file is None:
        log_dir = Path(__file__).resolve().parent.parent / "logs"
        log_dir.mkdir(exist_ok=True)
        log_file = str(log_dir / f"harness-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log")

    setup_logging(args.verbose, log_file=log_file)

    logger = logging.getLogger("harness.main")

    # Validate spec file exists
    if not args.spec.exists():
        logger.error(f"Spec file not found: {args.spec}")
        sys.exit(1)

    # Set environment for dashboard integration
    if args.dashboard_url:
        os.environ["DASHBOARD_URL"] = args.dashboard_url
    if args.dashboard_secret:
        os.environ["DASHBOARD_SECRET"] = args.dashboard_secret
    if args.model:
        os.environ["HARNESS_MODEL"] = args.model
    if args.model_planner:
        os.environ["HARNESS_MODEL_PLANNER"] = args.model_planner
    if args.model_generator:
        os.environ["HARNESS_MODEL_GENERATOR"] = args.model_generator
    if args.model_evaluator:
        os.environ["HARNESS_MODEL_EVALUATOR"] = args.model_evaluator

    from harness.client import get_model_for_role
    mode = "single" if args.single else "multi (architect-driven)"
    logger.info(f"Starting harness with spec: {args.spec}")
    logger.info(f"Mode: {mode}")
    logger.info(f"Models — planner: {get_model_for_role('planner')}, generator: {get_model_for_role('generator')}, evaluator: {get_model_for_role('evaluator')}")
    logger.info(f"Log file: {log_file}")
    if args.dashboard_url:
        logger.info(f"Dashboard: {args.dashboard_url}")

    if args.single:
        asyncio.run(run_orchestrator(args.spec.resolve()))
    else:
        asyncio.run(run_multi_orchestrator(args.spec.resolve()))


if __name__ == "__main__":
    main()
