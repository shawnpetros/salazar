"""Client factory for claude-agent-sdk sessions."""

import os
from pathlib import Path

from claude_agent_sdk import (
    ClaudeAgentOptions,
    HookMatcher,
    SandboxSettings,
)

from harness.security import bash_security_hook

# Resolve paths relative to the project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = PROJECT_ROOT / "output"


def make_options(
    *,
    system_prompt: str,
    role: str = "generator",
    max_budget_usd: float = 50.0,
    extra_allowed_tools: list[str] | None = None,
    mcp_servers: dict | None = None,
) -> ClaudeAgentOptions:
    """Create ClaudeAgentOptions for a harness agent session.

    Args:
        system_prompt: The system prompt for this agent role.
        role: Agent role name (planner, generator, evaluator).
        max_budget_usd: Per-session cost cap.
        extra_allowed_tools: Additional tools to auto-approve.
        mcp_servers: MCP server configs (e.g., Playwright for evaluator).
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

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
        cwd=str(OUTPUT_DIR),
        model=os.environ.get("HARNESS_MODEL", "claude-sonnet-4-6"),
        max_turns=1000,
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
