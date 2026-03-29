"""Hard validation gates — linter, type checker, build, tests.

The generator cannot mark a feature as done unless all validators pass.
Supports auto-detection of project toolchain for brownfield work.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

from salazar.client import OUTPUT_DIR

logger = logging.getLogger("harness.validators")


@dataclass
class ValidationResult:
    name: str
    passed: bool
    output: str


@dataclass
class ValidatorConfig:
    """Detected or configured validators for a project."""
    package_manager: str = "npm"
    typecheck: str | None = None
    lint: str | None = None
    build: str | None = None
    test: str | None = None

    @property
    def commands(self) -> list[tuple[str, str]]:
        """Return (name, command) pairs for all configured validators."""
        pairs = []
        if self.typecheck:
            pairs.append(("typecheck", self.typecheck))
        if self.lint:
            pairs.append(("lint", self.lint))
        if self.build:
            pairs.append(("build", self.build))
        if self.test:
            pairs.append(("test", self.test))
        return pairs


@dataclass
class BaselineResult:
    """Captured state before any changes — for regression detection."""
    validators: list[ValidationResult] = field(default_factory=list)
    test_count: int = 0
    all_passing: bool = False


def detect_validators(cwd: Path) -> ValidatorConfig:
    """Auto-detect the project's build/test/lint toolchain."""
    config = ValidatorConfig()

    # Detect package manager
    if (cwd / "pnpm-lock.yaml").exists():
        config.package_manager = "pnpm"
    elif (cwd / "yarn.lock").exists():
        config.package_manager = "yarn"
    elif (cwd / "bun.lockb").exists() or (cwd / "bun.lock").exists():
        config.package_manager = "bun"
    else:
        config.package_manager = "npm"

    pm = config.package_manager

    # Try package.json scripts
    pkg_path = cwd / "package.json"
    if pkg_path.exists():
        try:
            scripts = json.loads(pkg_path.read_text()).get("scripts", {})
        except (json.JSONDecodeError, OSError):
            scripts = {}

        # Typecheck
        for name in ["typecheck", "tsc", "check:types", "type-check"]:
            if name in scripts:
                config.typecheck = f"{pm} run {name}"
                break
        if not config.typecheck:
            config.typecheck = "npx tsc --noEmit"

        # Lint
        if "lint" in scripts:
            config.lint = f"{pm} run lint"
        elif "lint:check" in scripts:
            config.lint = f"{pm} run lint:check"

        # Build
        if "build" in scripts:
            config.build = f"{pm} run build"

        # Test
        if "test" in scripts:
            config.test = f"{pm} run test"
        elif "test:run" in scripts:
            config.test = f"{pm} run test:run"

    # Fallback: check for pyproject.toml (Python projects)
    elif (cwd / "pyproject.toml").exists():
        config.typecheck = "mypy . --ignore-missing-imports" if (cwd / "mypy.ini").exists() or (cwd / "pyproject.toml").exists() else None
        config.lint = "ruff check ." if (cwd / "ruff.toml").exists() else None
        config.test = "pytest" if (cwd / "pytest.ini").exists() or (cwd / "conftest.py").exists() else None

    # Load from explorer assessment if available
    assessment_path = cwd / "validator_assessment.json"
    if assessment_path.exists():
        try:
            assessment = json.loads(assessment_path.read_text())
            toolchain = assessment.get("toolchain", {})
            for name in ["typecheck", "lint", "build", "test"]:
                info = toolchain.get(name, {})
                if isinstance(info, dict) and info.get("command") and info.get("status") != "missing":
                    setattr(config, name, info["command"])
        except (json.JSONDecodeError, OSError):
            pass

    logger.info(
        f"[validators] Detected: pm={config.package_manager}, "
        f"typecheck={'yes' if config.typecheck else 'no'}, "
        f"lint={'yes' if config.lint else 'no'}, "
        f"build={'yes' if config.build else 'no'}, "
        f"test={'yes' if config.test else 'no'}"
    )

    return config


async def _run_cmd(name: str, cmd_str: str, cwd: Path) -> ValidationResult:
    """Run a shell command string and capture output.

    Uses process groups so we can kill the entire tree (npm → vitest → workers)
    when the command times out or the harness moves on.
    """
    import os
    import signal

    logger.info(f"[validators] Running {name}: {cmd_str}")
    proc = None
    try:
        # start_new_session=True creates a new process group so we can
        # kill the entire tree (npm → node → vitest → workers)
        proc = await asyncio.create_subprocess_shell(
            cmd_str,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            start_new_session=True,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        output = stdout.decode("utf-8", errors="replace")
        passed = proc.returncode == 0
        logger.info(f"[validators] {name}: {'PASS' if passed else 'FAIL'} (exit {proc.returncode})")
        return ValidationResult(name=name, passed=passed, output=output)
    except asyncio.TimeoutError:
        logger.warning(f"[validators] {name}: TIMEOUT — killing process group")
        _kill_process_group(proc)
        return ValidationResult(name=name, passed=False, output="Timed out after 120s")
    except FileNotFoundError:
        logger.warning(f"[validators] {name}: command not found")
        return ValidationResult(name=name, passed=False, output=f"Command not found: {cmd_str}")
    except Exception as e:
        logger.warning(f"[validators] {name}: unexpected error: {e}")
        _kill_process_group(proc)
        return ValidationResult(name=name, passed=False, output=str(e))


def _kill_process_group(proc: asyncio.subprocess.Process | None) -> None:
    """Kill a process and its entire process group."""
    import os
    import signal

    if proc is None or proc.returncode is not None:
        return  # Already exited

    try:
        # Kill the entire process group (npm + vitest + workers)
        pgid = os.getpgid(proc.pid)
        os.killpg(pgid, signal.SIGKILL)
        logger.info(f"[validators] Killed process group {pgid} (pid {proc.pid})")
    except (ProcessLookupError, OSError):
        # Process already dead
        try:
            proc.kill()
        except (ProcessLookupError, OSError):
            pass


async def run_all_validators(
    cwd: Path | None = None,
    config: ValidatorConfig | None = None,
) -> list[ValidationResult]:
    """Run all detected validators. Auto-detects if no config provided."""
    target = cwd or OUTPUT_DIR

    if config is None:
        config = detect_validators(target)

    if not config.commands:
        logger.warning(f"[validators] No validators detected in {target}")
        return [ValidationResult(name="setup", passed=False, output="No validators detected")]

    results = []

    # Run typecheck and lint in parallel (if both exist)
    parallel = []
    if config.typecheck:
        parallel.append(("typecheck", config.typecheck))
    if config.lint:
        parallel.append(("lint", config.lint))

    if parallel:
        parallel_results = await asyncio.gather(
            *[_run_cmd(name, cmd, target) for name, cmd in parallel]
        )
        results.extend(parallel_results)

    # Short-circuit: if typecheck failed, skip build and test
    typecheck_passed = all(r.passed for r in results if r.name == "typecheck")

    if config.build and typecheck_passed:
        build_result = await _run_cmd("build", config.build, target)
        results.append(build_result)

        if config.test and build_result.passed:
            test_result = await _run_cmd("test", config.test, target)
            results.append(test_result)
        elif config.test:
            results.append(ValidationResult(name="test", passed=False, output="Skipped: build failed"))
    elif config.build:
        results.append(ValidationResult(name="build", passed=False, output="Skipped: typecheck failed"))
        if config.test:
            results.append(ValidationResult(name="test", passed=False, output="Skipped: typecheck failed"))
    elif config.test and typecheck_passed:
        # No build step, but tests exist
        test_result = await _run_cmd("test", config.test, target)
        results.append(test_result)

    return results


async def run_tests_only(
    cwd: Path | None = None,
    config: ValidatorConfig | None = None,
) -> ValidationResult:
    """Run just the test command — used for TDD red/green checks."""
    target = cwd or OUTPUT_DIR

    if config is None:
        config = detect_validators(target)

    if not config.test:
        return ValidationResult(name="test", passed=False, output="No test command detected")

    return await _run_cmd("test", config.test, target)


async def capture_baseline(
    cwd: Path | None = None,
    config: ValidatorConfig | None = None,
) -> BaselineResult:
    """Capture the current validator state before any changes.

    Used for brownfield regression detection.
    """
    target = cwd or OUTPUT_DIR

    if config is None:
        config = detect_validators(target)

    results = await run_all_validators(target, config)

    # Try to extract test count from test output
    test_count = 0
    for r in results:
        if r.name == "test" and r.output:
            test_count = _parse_test_count(r.output)

    baseline = BaselineResult(
        validators=results,
        test_count=test_count,
        all_passing=all_passed(results),
    )

    logger.info(
        f"[validators] Baseline captured: {test_count} tests, "
        f"all_passing={baseline.all_passing}"
    )

    return baseline


async def check_regression(
    baseline: BaselineResult,
    cwd: Path | None = None,
    config: ValidatorConfig | None = None,
) -> tuple[bool, str]:
    """After changes, verify we haven't regressed.

    Returns (passed, message).
    """
    target = cwd or OUTPUT_DIR
    current = await run_all_validators(target, config)
    current_count = 0
    for r in current:
        if r.name == "test" and r.output:
            current_count = _parse_test_count(r.output)

    if current_count < baseline.test_count:
        msg = f"Test count decreased: {baseline.test_count} → {current_count}"
        logger.error(f"[validators] REGRESSION: {msg}")
        return False, msg

    if not all_passed(current):
        failures = format_failures(current)
        return False, failures

    return True, f"All validators pass. Tests: {baseline.test_count} → {current_count}"


def _parse_test_count(output: str) -> int:
    """Try to extract test count from test runner output.

    Vitest output looks like:
      Test Files  61 passed (61)
           Tests  1141 passed (1141)

    We want the Tests line, not Test Files.
    """
    import re

    # Vitest/Jest: line starting with "Tests" (not "Test Files")
    # Match "Tests  1141 passed (1141)" — all tests passing
    match = re.search(r"^\s*Tests\s+(\d+)\s+passed", output, re.MULTILINE)
    if match:
        return int(match.group(1))

    # Vitest with failures: "Tests  3 failed | 1138 passed (1141)"
    # Capture the PASSING count (1138), not the total (1141)
    match = re.search(r"^\s*Tests\s+\d+\s+\w+\s*\|\s*(\d+)\s+passed", output, re.MULTILINE)
    if match:
        return int(match.group(1))

    # Pytest: "42 passed" at the end of output
    match = re.search(r"(\d+)\s+passed", output)
    if match:
        return int(match.group(1))

    return 0


def all_passed(results: list[ValidationResult]) -> bool:
    """Check if all validators passed."""
    return all(r.passed for r in results)


def format_failures(results: list[ValidationResult]) -> str:
    """Format failed validation results for the generator's retry prompt."""
    failures = [r for r in results if not r.passed]
    if not failures:
        return "All validators passed."

    parts = []
    for f in failures:
        parts.append(f"## {f.name} FAILED\n{f.output[:2000]}")

    return "\n\n".join(parts)
