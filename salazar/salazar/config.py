"""Persistent user configuration for the installable CLI."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass

from salazar.paths import APP_DIR, CONFIG_PATH


@dataclass
class SalazarConfig:
    """User-configurable defaults for the Salazar CLI."""

    model: str = "claude-sonnet-4-6"
    model_planner: str | None = None
    model_generator: str | None = None
    model_evaluator: str | None = None
    dashboard_url: str | None = None
    dashboard_secret: str | None = None


def load_config() -> SalazarConfig:
    """Load persisted config, falling back to defaults on any error."""
    if not CONFIG_PATH.exists():
        return SalazarConfig()

    try:
        raw = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return SalazarConfig()

    allowed = {key: raw.get(key) for key in SalazarConfig.__dataclass_fields__}
    return SalazarConfig(**allowed)


def save_config(config: SalazarConfig) -> None:
    """Persist config to the user's Salazar config file."""
    APP_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(asdict(config), indent=2) + "\n", encoding="utf-8")
