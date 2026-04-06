"""Entry point for the agent-id harness."""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from salazar import __version__
from salazar.config import load_config
from salazar.paths import LOG_DIR, ensure_runtime_dirs


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
        "--version",
        action="version",
        version=f"%(prog)s {__version__}",
    )
    parser.add_argument(
        "spec",
        type=Path,
        nargs="?",
        help="Path to the app_spec.md file",
    )
    parser.add_argument(
        "--tui",
        action="store_true",
        help="Open the built-in TUI launcher",
    )
    parser.add_argument(
        "--config",
        action="store_true",
        help="Open the built-in TUI to edit saved CLI defaults",
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
        "--brownfield",
        action="store_true",
        help="Brownfield mode — explore existing codebase first, enable regression guards",
    )
    parser.add_argument(
        "--hardening",
        type=str,
        default="auto",
        choices=["auto", "minimal", "thorough", "skip"],
        help="Hardening level for brownfield: auto (default), minimal, thorough, skip",
    )
    parser.add_argument(
        "--dashboard-url",
        type=str,
        default=None,
        help="URL of the monitoring dashboard (e.g., https://agent-id.vercel.app)",
    )
    parser.add_argument(
        "--dashboard-secret",
        type=str,
        default=None,
        help="Bearer token for dashboard ingest endpoint",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Default model for all agent roles",
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
    ensure_runtime_dirs()

    if args.config or args.tui or args.spec is None:
        try:
            from salazar.config_tui import run_config_tui, run_launcher_tui
        except ModuleNotFoundError as exc:
            print(
                f"Salazar's TUI dependency '{exc.name}' is not installed. "
                "Reinstall the package with its default dependencies and run `salazar --tui`.",
                file=sys.stderr,
            )
            sys.exit(1)

        if args.config:
            run_config_tui()
        else:
            run_launcher_tui()
        return

    config = load_config()
    dashboard_url = args.dashboard_url or config.dashboard_url or ""
    dashboard_secret = args.dashboard_secret or config.dashboard_secret or ""
    model = args.model or config.model
    model_planner = args.model_planner or config.model_planner
    model_generator = args.model_generator or config.model_generator
    model_evaluator = args.model_evaluator or config.model_evaluator

    # Default log file if not specified
    import os
    from datetime import datetime
    log_file = args.log_file
    if log_file is None:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_file = str(LOG_DIR / f"harness-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log")

    setup_logging(args.verbose, log_file=log_file)

    logger = logging.getLogger("salazar.main")

    # Validate spec file exists
    if args.spec is None or not args.spec.exists():
        logger.error(f"Spec file not found: {args.spec}")
        sys.exit(1)

    # Set environment for dashboard integration
    if dashboard_url:
        os.environ["DASHBOARD_URL"] = dashboard_url
    if dashboard_secret:
        os.environ["DASHBOARD_SECRET"] = dashboard_secret
    if model:
        os.environ["HARNESS_MODEL"] = model
    if model_planner:
        os.environ["HARNESS_MODEL_PLANNER"] = model_planner
    if model_generator:
        os.environ["HARNESS_MODEL_GENERATOR"] = model_generator
    if model_evaluator:
        os.environ["HARNESS_MODEL_EVALUATOR"] = model_evaluator

    try:
        from salazar.multi_orchestrator import run_multi_orchestrator
        from salazar.orchestrator import run_orchestrator
    except ModuleNotFoundError as exc:
        print(
            f"Salazar runtime dependency '{exc.name}' is not installed. "
            "Reinstall the package with its default dependencies before running a spec.",
            file=sys.stderr,
        )
        sys.exit(1)

    from salazar.client import get_model_for_role
    mode = "brownfield" if args.brownfield else ("single" if args.single else "multi (architect-driven)")
    logger.info(f"Starting harness with spec: {args.spec}")
    logger.info(f"Mode: {mode}")
    if args.brownfield:
        logger.info(f"Hardening: {args.hardening}")
    logger.info(f"Models — planner: {get_model_for_role('planner')}, generator: {get_model_for_role('generator')}, evaluator: {get_model_for_role('evaluator')}")
    logger.info(f"Log file: {log_file}")
    if dashboard_url:
        logger.info(f"Dashboard: {dashboard_url}")

    if args.single or args.brownfield:
        asyncio.run(run_orchestrator(
            args.spec.resolve(),
            brownfield=args.brownfield,
            hardening=args.hardening,
        ))
    else:
        asyncio.run(run_multi_orchestrator(args.spec.resolve()))


if __name__ == "__main__":
    main()
