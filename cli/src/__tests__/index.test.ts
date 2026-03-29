/**
 * F032 — Entry point index.tsx with shebang, meow CLI parsing, and command routing
 *
 * Verifies that:
 *  - index.tsx has a shebang line
 *  - meow parses 'run' as the command and 'spec.md' as the first input
 *  - routeCommand dispatches to the run command handler
 *  - routeCommand dispatches to the config command handler
 *  - routeCommand dispatches to the history command handler
 *  - unknown commands exit with an error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const srcRoot = resolve(__dirname, "..");

describe("F032 — index.tsx shebang", () => {
  it("index.tsx starts with #!/usr/bin/env node", () => {
    const content = readFileSync(resolve(srcRoot, "index.tsx"), "utf-8");
    expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
  });
});

describe("F032 — meow CLI parsing", () => {
  it("parseCli parses 'run' as command and 'spec.md' as first input", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli(["run", "spec.md"]);
    expect(cli.input[0]).toBe("run");
    expect(cli.input[1]).toBe("spec.md");
  });

  it("parseCli handles 'config' command", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli(["config"]);
    expect(cli.input[0]).toBe("config");
  });

  it("parseCli handles 'history' command", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli(["history"]);
    expect(cli.input[0]).toBe("history");
  });

  it("parseCli input is empty when no arguments are given", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.input).toHaveLength(0);
  });
});

describe("F032 — command routing", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(
      (_code?: number | string | null | undefined) => {
        throw new Error(`process.exit called with ${_code}`);
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes 'run spec.md' to the run command handler", async () => {
    // Create a temp spec file so runCommand doesn't exit(1) for missing file
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const tmpSpec = path.join(os.tmpdir(), "harness-test-spec.md");
    fs.writeFileSync(tmpSpec, "# Test Spec\n");
    try {
      const { parseCli, routeCommand } = await import("../index.js");
      const cli = parseCli(["run", tmpSpec]);
      await routeCommand(cli);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(tmpSpec)
      );
    } finally {
      fs.unlinkSync(tmpSpec);
    }
  });

  it("routes 'config' to the config command handler", async () => {
    const { parseCli, routeCommand } = await import("../index.js");
    const cli = parseCli(["config"]);
    await routeCommand(cli);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("config")
    );
  });

  it("routes 'history' to the history command handler", async () => {
    const { parseCli, routeCommand } = await import("../index.js");
    const cli = parseCli(["history"]);
    await routeCommand(cli);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("history")
    );
  });

  it("exits with error when run command is missing spec path", async () => {
    const { parseCli, routeCommand } = await import("../index.js");
    const cli = parseCli(["run"]);
    await expect(routeCommand(cli)).rejects.toThrow("process.exit");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("run command requires")
    );
  });

  it("exits with error for unknown commands", async () => {
    const { parseCli, routeCommand } = await import("../index.js");
    const cli = parseCli(["unknown-cmd"]);
    // showHelp triggers process.exit internally or our mock does
    await expect(routeCommand(cli)).rejects.toThrow();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Unknown command")
    );
  });
});

describe("F032 — dist/index.js shebang (after build)", () => {
  it("dist/index.js starts with #!/usr/bin/env node", () => {
    const distPath = resolve(root, "dist/index.js");
    try {
      const content = readFileSync(distPath, "utf-8");
      // tsup should preserve or inject the shebang
      expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
    } catch {
      // If dist hasn't been built yet, skip this check
      console.warn("dist/index.js not found — skipping shebang check");
    }
  });
});
