"""Helpers for loading packaged runtime assets."""

from importlib.resources import files


def read_prompt(name: str) -> str:
    """Read a packaged prompt file."""
    return files("salazar.prompts").joinpath(name).read_text(encoding="utf-8")
