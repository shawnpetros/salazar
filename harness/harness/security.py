"""Bash command allowlist — PreToolUse hook for sandbox defense-in-depth."""

import re
import shlex
from claude_agent_sdk import (
    HookJSONOutput,
    PreToolUseHookInput,
    HookContext,
)

# Commands the generator/evaluator agents are allowed to run
ALLOWED_COMMANDS = {
    "ls", "cat", "head", "tail", "wc", "grep", "find",
    "cp", "mv", "mkdir", "chmod", "pwd", "echo", "printf",
    "npm", "npx", "node", "tsc", "eslint",
    "git", "touch", "rm", "sort", "uniq", "diff",
    "curl", "jq", "sed", "awk",
    "python3", "pip",
}

# Commands that need extra validation
RESTRICTED_COMMANDS = {
    "rm": lambda args: not any(a in args for a in ["-rf /", "-rf ~", "--no-preserve-root"]),
    "chmod": lambda args: "+x" in args or "755" in args or "644" in args,
    "curl": lambda _: True,  # Allow but could restrict domains later
}


def _extract_base_commands(command: str) -> list[str]:
    """Extract base command names from a compound shell command."""
    # Split on shell operators
    parts = re.split(r'[|;&]|&&|\|\|', command)
    commands = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        try:
            tokens = shlex.split(part)
        except ValueError:
            # Unparseable — fail closed
            return ["__UNPARSEABLE__"]
        if tokens:
            # Skip env var assignments at the start
            cmd = tokens[0]
            for t in tokens:
                if "=" in t and t.index("=") > 0:
                    continue
                cmd = t
                break
            commands.append(cmd)
    return commands


async def bash_security_hook(
    input_data: PreToolUseHookInput,
    tool_use_id: str,
    context: HookContext,
) -> HookJSONOutput:
    """Validate bash commands against the allowlist."""
    tool_input = input_data.get("input", {})
    command = tool_input.get("command", "")

    if not command:
        return {"decision": "deny", "reason": "Empty command"}

    base_commands = _extract_base_commands(command)

    for cmd in base_commands:
        # Get just the binary name (strip path)
        cmd_name = cmd.split("/")[-1]

        if cmd_name == "__UNPARSEABLE__":
            return {
                "decision": "deny",
                "reason": f"Could not parse command: {command}",
            }

        if cmd_name not in ALLOWED_COMMANDS:
            return {
                "decision": "deny",
                "reason": f"Command '{cmd_name}' is not in the allowlist",
            }

        # Extra validation for restricted commands
        if cmd_name in RESTRICTED_COMMANDS:
            if not RESTRICTED_COMMANDS[cmd_name](command):
                return {
                    "decision": "deny",
                    "reason": f"Command '{cmd_name}' failed safety check: {command}",
                }

    return {"decision": "allow"}
