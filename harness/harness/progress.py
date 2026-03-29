"""Feature list progress tracking — reads/updates feature_list.json."""

import json
from pathlib import Path
from dataclasses import dataclass

import os

from harness.client import OUTPUT_DIR

FEATURE_LIST_PATH = OUTPUT_DIR / "feature_list.json"

# Session-scoped feature list directory
HARNESS_DIR_NAME = ".harness"


def feature_list_path(work_dir: Path | None = None, session_id: str | None = None) -> Path:
    """Get the feature_list.json path for a given work directory.

    In brownfield mode, feature lists are stored in .harness/<session_id>/
    so multiple runs don't clobber each other. In greenfield mode,
    falls back to feature_list.json in the work dir root.
    """
    base = work_dir or OUTPUT_DIR
    sid = session_id or os.environ.get("HARNESS_SESSION_ID")

    if sid:
        harness_dir = base / HARNESS_DIR_NAME / sid
        harness_dir.mkdir(parents=True, exist_ok=True)
        return harness_dir / "feature_list.json"

    return base / "feature_list.json"


def list_previous_runs(work_dir: Path | None = None) -> list[str]:
    """List all previous harness session IDs in a work directory."""
    base = work_dir or OUTPUT_DIR
    harness_dir = base / HARNESS_DIR_NAME
    if not harness_dir.exists():
        return []
    return sorted(
        [d.name for d in harness_dir.iterdir() if d.is_dir() and (d / "feature_list.json").exists()],
        reverse=True,
    )


@dataclass
class ProgressReport:
    total: int
    passing: int
    items: list[dict]

    @property
    def percent(self) -> float:
        return (self.passing / self.total * 100) if self.total > 0 else 0.0

    @property
    def is_complete(self) -> bool:
        return self.passing == self.total and self.total > 0

    def next_incomplete(self) -> dict | None:
        """Return the next feature that hasn't passed yet."""
        for item in self.items:
            if not item.get("passes", False):
                return item
        return None


def read_progress(work_dir: Path | None = None) -> ProgressReport | None:
    """Read the feature list and return a progress report."""
    path = feature_list_path(work_dir)
    if not path.exists():
        return None

    data = json.loads(path.read_text())
    features = data if isinstance(data, list) else data.get("features", [])

    passing = sum(1 for f in features if f.get("passes", False))

    return ProgressReport(
        total=len(features),
        passing=passing,
        items=features,
    )


def format_progress_header(report: ProgressReport) -> str:
    """Format a progress summary for agent prompts."""
    return (
        f"Progress: {report.passing}/{report.total} features passing "
        f"({report.percent:.0f}%)\n"
    )


def get_feature_summary(report: ProgressReport) -> dict:
    """Get a summary dict suitable for dashboard push."""
    return {
        "total": report.total,
        "passing": report.passing,
        "items": [
            {
                "id": f.get("id", f.get("category", "unknown")),
                "name": f.get("description", f.get("name", "unnamed")),
                "passes": f.get("passes", False),
            }
            for f in report.items
        ],
    }
