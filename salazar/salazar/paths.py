"""Common filesystem paths for installed Salazar runtime state."""

import os
from pathlib import Path

APP_DIR = Path(os.environ.get("SALAZAR_HOME", str(Path.home() / ".salazar"))).expanduser()
OUTPUT_DIR = APP_DIR / "output"
LOG_DIR = APP_DIR / "logs"
DB_PATH = APP_DIR / "salazar.db"
CONFIG_PATH = APP_DIR / "config.json"


def ensure_runtime_dirs() -> None:
    """Create the standard writable runtime directories."""
    APP_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
