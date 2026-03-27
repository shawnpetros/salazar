"""Hard validation gates — linter, type checker, build, tests.

The generator cannot mark a feature as done unless all validators pass.
"""

import asyncio
import logging
from dataclasses import dataclass
from pathlib import Path

from harness.client import OUTPUT_DIR

logger = logging.getLogger("harness.validators")


@dataclass
class ValidationResult:
    name: str
    passed: bool
    output: str


async def _run_cmd(name: str, cmd: list[str], cwd: Path) -> ValidationResult:
    """Run a shell command and capture output."""
    logger.info(f"[validators] Running {name}: {' '.join(cmd)}")
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        output = stdout.decode("utf-8", errors="replace")
        passed = proc.returncode == 0
        logger.info(f"[validators] {name}: {'PASS' if passed else 'FAIL'} (exit {proc.returncode})")
        return ValidationResult(name=name, passed=passed, output=output)
    except asyncio.TimeoutError:
        logger.warning(f"[validators] {name}: TIMEOUT")
        return ValidationResult(name=name, passed=False, output="Timed out after 120s")
    except FileNotFoundError:
        logger.warning(f"[validators] {name}: command not found")
        return ValidationResult(name=name, passed=False, output=f"Command not found: {cmd[0]}")


async def run_typecheck(cwd: Path | None = None) -> ValidationResult:
    """Run TypeScript type checking."""
    target = cwd or OUTPUT_DIR
    return await _run_cmd("typecheck", ["npx", "tsc", "--noEmit"], target)


async def run_lint(cwd: Path | None = None) -> ValidationResult:
    """Run ESLint."""
    target = cwd or OUTPUT_DIR
    return await _run_cmd("lint", ["npx", "eslint", "."], target)


async def run_build(cwd: Path | None = None) -> ValidationResult:
    """Run npm build."""
    target = cwd or OUTPUT_DIR
    return await _run_cmd("build", ["npm", "run", "build"], target)


async def run_tests(cwd: Path | None = None) -> ValidationResult:
    """Run npm test."""
    target = cwd or OUTPUT_DIR
    return await _run_cmd("test", ["npm", "test"], target)


async def run_all_validators(cwd: Path | None = None) -> list[ValidationResult]:
    """Run all validators and return results.

    Runs typecheck and lint in parallel first, then build, then tests.
    Short-circuits: if build fails, tests are skipped.
    """
    target = cwd or OUTPUT_DIR

    # Check if package.json exists (no point running npm commands without it)
    if not (target / "package.json").exists():
        logger.warning(f"[validators] No package.json found in {target}, skipping npm-based validators")
        return [ValidationResult(name="setup", passed=False, output="No package.json found")]

    # Run typecheck and lint in parallel
    typecheck_result, lint_result = await asyncio.gather(
        run_typecheck(target),
        run_lint(target),
    )

    results = [typecheck_result, lint_result]

    # Only run build if typecheck passed
    if typecheck_result.passed:
        build_result = await run_build(target)
        results.append(build_result)

        # Only run tests if build passed
        if build_result.passed:
            test_result = await run_tests(target)
            results.append(test_result)
        else:
            results.append(ValidationResult(name="test", passed=False, output="Skipped: build failed"))
    else:
        results.append(ValidationResult(name="build", passed=False, output="Skipped: typecheck failed"))
        results.append(ValidationResult(name="test", passed=False, output="Skipped: typecheck failed"))

    return results


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
