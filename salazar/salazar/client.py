"""Client factory for claude-agent-sdk sessions with model tier support."""

import os
from pathlib import Path

from claude_agent_sdk import (
    ClaudeAgentOptions,
    HookMatcher,
    SandboxSettings,
)

from salazar.security import bash_security_hook

# Resolve paths relative to the project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = PROJECT_ROOT / "output"

# Model tier defaults — override with env vars
MODEL_TIERS = {
    "planner": "HARNESS_MODEL_PLANNER",
    "generator": "HARNESS_MODEL_GENERATOR",
    "evaluator": "HARNESS_MODEL_EVALUATOR",
}

DEFAULT_MODELS = {
    "planner": "claude-sonnet-4-6",
    "generator": "claude-sonnet-4-6",
    "evaluator": "claude-sonnet-4-6",  # Upgrade to opus for production runs
}


def get_model_for_role(role: str) -> str:
    """Get the model for a given agent role, checking env var overrides."""
    env_key = MODEL_TIERS.get(role, "HARNESS_MODEL")
    return os.environ.get(env_key, os.environ.get("HARNESS_MODEL", DEFAULT_MODELS.get(role, "claude-sonnet-4-6")))


def make_options(
    *,
    system_prompt: str,
    role: str = "generator",
    model_override: str | None = None,
    max_budget_usd: float = 50.0,
    max_turns: int = 1000,
    extra_allowed_tools: list[str] | None = None,
    mcp_servers: dict | None = None,
) -> ClaudeAgentOptions:
    """Create ClaudeAgentOptions for a harness agent session.

    Args:
        system_prompt: The system prompt for this agent role.
        role: Agent role name (planner, generator, evaluator).
        model_override: Explicit model override (takes priority over env/defaults).
        max_budget_usd: Per-session cost cap.
        max_turns: Max conversation turns per session.
        extra_allowed_tools: Additional tools to auto-approve.
        mcp_servers: MCP server configs (e.g., Playwright for evaluator).
    """
    # In brownfield mode, HARNESS_WORK_DIR overrides OUTPUT_DIR
    effective_cwd = Path(os.environ.get("HARNESS_WORK_DIR", str(OUTPUT_DIR)))
    effective_cwd.mkdir(parents=True, exist_ok=True)

    model = model_override or get_model_for_role(role)

    allowed_tools = [
        "Read",
        "Write",
        "Edit",
        "Glob",
        "Grep",
        "Bash",
    ]
    if extra_allowed_tools:
        allowed_tools.extend(extra_allowed_tools)

    opts = ClaudeAgentOptions(
        system_prompt=system_prompt,
        permission_mode="bypassPermissions",
        cwd=str(effective_cwd),
        model=model,
        max_turns=max_turns,
        max_budget_usd=max_budget_usd,
        sandbox=SandboxSettings(
            enabled=True,
            autoAllowBashIfSandboxed=True,
        ),
        hooks={
            "PreToolUse": [
                HookMatcher(matcher="Bash", hooks=[bash_security_hook]),
            ],
        },
        allowed_tools=allowed_tools,
        env={
            "HARNESS_ROLE": role,
            "HARNESS_OUTPUT_DIR": str(OUTPUT_DIR),
        },
    )

    if mcp_servers:
        opts.mcp_servers = mcp_servers

    return opts
