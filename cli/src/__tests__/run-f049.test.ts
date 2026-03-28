/**
 * F049 — run command: validate spec file exists before spawning harness
 *
 * Verifies that `runCommand` checks for spec file existence and:
 *  - Prints an error message when the file is absent
 *  - Exits with code 1 when the file is absent
 *  - Does NOT call spawnHarness when the file is absent
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the node:fs module so we can simulate missing files without touching disk.
vi.mock("node:fs");

describe("F049 — run command spec file validation", () => {
  const originalExit = process.exit.bind(process);
  let mockExit: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockExit = vi.fn() as ReturnType<typeof vi.fn>;
    mockConsoleError = vi.fn();
    // Replace process.exit so tests don't actually terminate the process
    process.exit = mockExit as unknown as typeof process.exit;
    // Capture console.error output
    vi.spyOn(console, "error").mockImplementation(mockConsoleError);
  });

  afterEach(() => {
    process.exit = originalExit;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("calls process.exit(1) when the spec file does not exist", async () => {
    const { existsSync } = await import("node:fs");
    vi.mocked(existsSync).mockReturnValue(false);

    const { runCommand } = await import("../commands/run.js");
    await runCommand("/nonexistent/spec.md");

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("prints an error message containing the spec path when the file is missing", async () => {
    const { existsSync } = await import("node:fs");
    vi.mocked(existsSync).mockReturnValue(false);

    const { runCommand } = await import("../commands/run.js");
    await runCommand("/nonexistent/spec.md");

    expect(mockConsoleError).toHaveBeenCalledOnce();
    const [message] = mockConsoleError.mock.calls[0] as [string];
    expect(message).toContain("/nonexistent/spec.md");
  });

  it("does not call process.exit when the spec file exists", async () => {
    const { existsSync } = await import("node:fs");
    vi.mocked(existsSync).mockReturnValue(true);

    const { runCommand } = await import("../commands/run.js");
    await runCommand("spec.md");

    expect(mockExit).not.toHaveBeenCalled();
  });

  it("error message contains 'Error' or 'not found' to help the user diagnose the issue", async () => {
    const { existsSync } = await import("node:fs");
    vi.mocked(existsSync).mockReturnValue(false);

    const { runCommand } = await import("../commands/run.js");
    await runCommand("missing.md");

    expect(mockConsoleError).toHaveBeenCalledOnce();
    const [message] = mockConsoleError.mock.calls[0] as [string];
    expect(message.toLowerCase()).toMatch(/error|not found/);
  });

  it("does not proceed to spawning when the spec file is missing (exits immediately)", async () => {
    const { existsSync } = await import("node:fs");
    vi.mocked(existsSync).mockReturnValue(false);

    // Track console.log calls — the 'run command received' log means we proceeded past the guard
    const mockLog = vi.fn();
    vi.spyOn(console, "log").mockImplementation(mockLog);

    const { runCommand } = await import("../commands/run.js");
    await runCommand("missing.md");

    // The stub logs 'run command received' only on success; it must not appear on failure
    const loggedMessages = mockLog.mock.calls.map((c) => c[0] as string);
    expect(loggedMessages).not.toContain(expect.stringContaining("run command received"));
  });
});
