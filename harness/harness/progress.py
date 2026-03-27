"""Feature list progress tracking — reads/updates feature_list.json."""

import json
from pathlib import Path
from dataclasses import dataclass

from harness.client import OUTPUT_DIR

FEATURE_LIST_PATH = OUTPUT_DIR / "feature_list.json"


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


def read_progress() -> ProgressReport | None:
    """Read the feature list and return a progress report."""
    if not FEATURE_LIST_PATH.exists():
        return None

    data = json.loads(FEATURE_LIST_PATH.read_text())
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
