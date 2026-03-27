"""Entry point for the agent-id harness."""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from harness.orchestrator import run_orchestrator


def setup_logging(verbose: bool = False) -> None:
    """Configure structured logging."""
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"
    logging.basicConfig(level=level, format=fmt, stream=sys.stderr)


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
        help="Model to use for agent sessions (default: claude-sonnet-4-6)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    setup_logging(args.verbose)

    logger = logging.getLogger("harness.main")

    # Validate spec file exists
    if not args.spec.exists():
        logger.error(f"Spec file not found: {args.spec}")
        sys.exit(1)

    # Set environment for dashboard integration
    import os
    if args.dashboard_url:
        os.environ["DASHBOARD_URL"] = args.dashboard_url
    if args.dashboard_secret:
        os.environ["DASHBOARD_SECRET"] = args.dashboard_secret
    if args.model:
        os.environ["HARNESS_MODEL"] = args.model

    logger.info(f"Starting harness with spec: {args.spec}")
    logger.info(f"Model: {os.environ.get('HARNESS_MODEL', 'claude-sonnet-4-6')}")
    if args.dashboard_url:
        logger.info(f"Dashboard: {args.dashboard_url}")

    asyncio.run(run_orchestrator(args.spec.resolve()))


if __name__ == "__main__":
    main()
