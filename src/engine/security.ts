/**
 * Bash command allowlist — PreToolUse hook for sandbox defense-in-depth.
 * Ported from salazar/salazar/security.py
 */

const ALLOWED_COMMANDS = new Set([
  "ls", "cat", "head", "tail", "wc", "grep", "find",
  "cp", "mv", "mkdir", "chmod", "pwd", "echo", "printf",
  "npm", "npx", "node", "tsc", "eslint",
  "git", "touch", "rm", "sort", "uniq", "diff",
  "curl", "jq", "sed", "awk",
]);

/**
 * Split a compound shell command on pipe/semicolon/ampersand operators
 * and return the base command name for each part.
 */
function extractBaseCommands(command: string): string[] {
  // Split on |, ;, &, &&, ||
  const parts = command.split(/\|{1,2}|;|&{1,2}/);
  const commands: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Tokenize on whitespace (simple split — sufficient for allowlist check)
    const tokens = trimmed.split(/\s+/);
    if (tokens.length === 0) continue;

    // Skip leading env var assignments (FOO=bar)
    let cmd = tokens[0];
    for (const token of tokens) {
      // An env var assignment has '=' somewhere after position 0
      const eqIdx = token.indexOf("=");
      if (eqIdx > 0) {
        // This token is an assignment — skip it, keep looking
        continue;
      }
      cmd = token;
      break;
    }

    commands.push(cmd);
  }

  return commands;
}

/**
 * PreToolUse hook that validates bash commands against the allowlist.
 * Compatible with Agent SDK HookCallback signature.
 */
export async function bashSecurityHook(input: any): Promise<Record<string, unknown>> {
  // Agent SDK delivers the command at input.input.command or input.tool_input.command
  const toolInput = input?.input ?? input?.tool_input ?? {};
  const command: string = toolInput?.command ?? "";

  if (!command.trim()) {
    return { decision: "deny", reason: "Empty command" };
  }

  const baseCommands = extractBaseCommands(command);

  if (baseCommands.length === 0) {
    return { decision: "deny", reason: "Could not extract any commands" };
  }

  for (const cmd of baseCommands) {
    // Strip path prefix — get just the binary name
    const cmdName = cmd.split("/").at(-1) ?? cmd;

    if (!ALLOWED_COMMANDS.has(cmdName)) {
      return {
        decision: "deny",
        reason: `Command '${cmdName}' is not in the allowlist`,
      };
    }
  }

  return { decision: "allow" };
}
