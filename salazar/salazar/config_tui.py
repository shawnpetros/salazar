"""Built-in Textual TUI for onboarding and config."""

from __future__ import annotations

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import VerticalScroll
from textual.widgets import Button, Footer, Header, Input, Label, Static

from salazar.config import SalazarConfig, load_config, save_config
from salazar.paths import CONFIG_PATH


class SalazarTUI(App[None]):
    """Interactive launcher and onboarding experience for the installed CLI."""

    CSS = """
    Screen {
        align: center middle;
    }

    #panel {
        width: 92;
        max-width: 96%;
        height: auto;
        max-height: 95%;
        padding: 1 2;
        border: round $primary;
        background: $surface;
    }

    #title {
        text-style: bold;
        padding-bottom: 1;
    }

    #intro {
        padding-bottom: 1;
    }

    #quickstart {
        margin-top: 1;
        padding: 1;
        border: round $boost;
        background: $panel;
    }

    .field-label {
        margin-top: 1;
    }

    .action {
        margin-top: 1;
    }

    #status {
        margin-top: 1;
        color: $success;
        height: auto;
    }
    """

    BINDINGS = [
        Binding("ctrl+s", "save", "Save"),
        Binding("escape", "quit", "Quit"),
    ]

    def __init__(self, mode: str = "home"):
        super().__init__()
        self.mode = mode
        self.config = load_config()
        self.first_run = not CONFIG_PATH.exists()

    def compose(self) -> ComposeResult:
        title = "Welcome to Salazar" if self.first_run else "Salazar Launcher"
        intro = _intro_text(self.mode, self.first_run)

        yield Header(show_clock=False)
        with VerticalScroll(id="panel"):
            yield Static(title, id="title")
            yield Static(intro, id="intro")
            yield Static(_quickstart_text(), id="quickstart")

            yield Label("Default model", classes="field-label")
            yield Input(value=self.config.model, id="model", placeholder="claude-sonnet-4-6")

            yield Label("Planner model override", classes="field-label")
            yield Input(value=self.config.model_planner or "", id="model_planner")

            yield Label("Generator model override", classes="field-label")
            yield Input(value=self.config.model_generator or "", id="model_generator")

            yield Label("Evaluator model override", classes="field-label")
            yield Input(value=self.config.model_evaluator or "", id="model_evaluator")

            yield Label("Dashboard URL", classes="field-label")
            yield Input(value=self.config.dashboard_url or "", id="dashboard_url")

            yield Label("Dashboard secret", classes="field-label")
            yield Input(value=self.config.dashboard_secret or "", id="dashboard_secret", password=True)

            yield Button("Save defaults", id="save", variant="success", classes="action")
            yield Button("Exit", id="exit", classes="action")
            yield Static("", id="status")
        yield Footer()

    def action_save(self) -> None:
        self._save()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "save":
            self._save()
        elif event.button.id == "exit":
            self.exit()

    def _save(self) -> None:
        updated = SalazarConfig(
            model=self.query_one("#model", Input).value.strip() or "claude-sonnet-4-6",
            model_planner=_optional(self.query_one("#model_planner", Input).value),
            model_generator=_optional(self.query_one("#model_generator", Input).value),
            model_evaluator=_optional(self.query_one("#model_evaluator", Input).value),
            dashboard_url=_optional(self.query_one("#dashboard_url", Input).value),
            dashboard_secret=_optional(self.query_one("#dashboard_secret", Input).value),
        )
        save_config(updated)
        self.config = updated
        self.first_run = False
        self.query_one("#status", Static).update(
            "Saved. Run `salazar path/to/spec.md` to start a build, or reopen with `salazar --tui`."
        )


def _optional(value: str) -> str | None:
    stripped = value.strip()
    return stripped or None


def _intro_text(mode: str, first_run: bool) -> str:
    if first_run:
        return (
            "This onboarding screen is built into the Python CLI. "
            "Set your default models and optional dashboard settings, then save."
        )
    if mode == "config":
        return "Update your saved defaults for the installed `salazar` command."
    return "The installed CLI is ready. Review or update defaults here before running a spec."


def _quickstart_text() -> str:
    return (
        "Quick start\n"
        "  salazar --version\n"
        "  salazar --tui\n"
        "  salazar path/to/spec.md\n"
        "  salazar existing-project/features.md --brownfield"
    )


def run_tui(mode: str = "home") -> None:
    """Launch the built-in TUI."""
    SalazarTUI(mode=mode).run()


def run_config_tui() -> None:
    """Launch the built-in configuration editor."""
    run_tui(mode="config")


def run_launcher_tui() -> None:
    """Launch the default TUI entrypoint used by `salazar`."""
    run_tui(mode="home")
