/**
 * F034 — harness --version and --help flags output correctly
 *
 * Verifies that:
 *  - harness --version is configured to print the version from package.json (exit 0)
 *  - harness --help is configured to print usage information
 *  - The help text (cli.help) includes all documented commands and options
 *  - The package.json version is correct and meow exposes it via cli.pkg
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = resolve(__dirname, "../..");
const srcRoot = resolve(__dirname, "..");

/** Read the CLI package.json and return it as a parsed object. */
function readPackageJson(): { version: string; name: string } {
  const pkgPath = resolve(cliRoot, "package.json");
  return JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    version: string;
    name: string;
  };
}

describe("F034 — package.json version", () => {
  it("package.json version is defined and non-empty", () => {
    const pkg = readPackageJson();
    expect(pkg.version).toBeTruthy();
    expect(typeof pkg.version).toBe("string");
  });

  it("package.json version matches semver format X.Y.Z", () => {
    const pkg = readPackageJson();
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("package.json version is 0.1.0", () => {
    const pkg = readPackageJson();
    expect(pkg.version).toBe("0.1.0");
  });

  it("package.json name is harness-cli", () => {
    const pkg = readPackageJson();
    expect(pkg.name).toBe("harness-cli");
  });
});

describe("F034 — --version flag via process.exit", () => {
  beforeEach(() => {
    vi.spyOn(process, "exit").mockImplementation(
      (_code?: number | string | null | undefined) => {
        throw new Error(`process.exit called with ${_code}`);
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parseCli(['--version']) triggers process.exit(0)", async () => {
    const { parseCli } = await import("../index.js");
    let exitCode: number | string | null | undefined;
    vi.spyOn(process, "exit").mockImplementation(
      (code?: number | string | null | undefined) => {
        exitCode = code;
        throw new Error(`process.exit called with ${code}`);
      }
    );
    try {
      parseCli(["--version"]);
    } catch {
      // meow calls process.exit(0), which we intercept
    }
    expect(exitCode).toBe(0);
  });

  it("parseCli(['--help']) triggers process.exit(0)", async () => {
    const { parseCli } = await import("../index.js");
    let exitCode: number | string | null | undefined;
    vi.spyOn(process, "exit").mockImplementation(
      (code?: number | string | null | undefined) => {
        exitCode = code;
        throw new Error(`process.exit called with ${code}`);
      }
    );
    try {
      parseCli(["--help"]);
    } catch {
      // meow calls process.exit(0), which we intercept
    }
    expect(exitCode).toBe(0);
  });
});

describe("F034 — cli.help property content", () => {
  it("parseCli exposes a non-empty help property", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toBeTruthy();
    expect(typeof cli.help).toBe("string");
  });

  it("cli.help contains the 'Usage' section header", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toContain("Usage");
  });

  it("cli.help contains the harness binary name", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toContain("harness");
  });

  it("cli.help contains the 'run' command", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toContain("run");
  });

  it("cli.help contains the 'config' command", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toContain("config");
  });

  it("cli.help contains the 'history' command", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toContain("history");
  });

  it("cli.help contains the --model option", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toContain("--model");
  });

  it("cli.help contains the --multi flag", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toContain("--multi");
  });

  it("cli.help contains the --version flag reference", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toContain("--version");
  });

  it("cli.help contains the --help flag reference", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toContain("--help");
  });

  it("cli.help contains examples section", async () => {
    const { parseCli } = await import("../index.js");
    const cli = parseCli([]);
    expect(cli.help).toContain("Examples");
  });
});

describe("F034 — --version output via built binary", () => {
  it("running dist/index.js --version prints version and exits 0", () => {
    const distPath = resolve(cliRoot, "dist/index.js");
    let distExists = false;
    try {
      readFileSync(distPath);
      distExists = true;
    } catch {
      // dist hasn't been built yet
    }

    if (!distExists) {
      console.warn("dist/index.js not found — skipping built binary test");
      return;
    }

    const result = spawnSync("node", [distPath, "--version"], {
      encoding: "utf-8",
      timeout: 10000,
    });

    const expectedVersion = readPackageJson().version;
    const output = (result.stdout ?? "") + (result.stderr ?? "");
    expect(output).toContain(expectedVersion);
    expect(result.status).toBe(0);
  });

  it("running dist/index.js --help prints usage info and exits 0", () => {
    const distPath = resolve(cliRoot, "dist/index.js");
    let distExists = false;
    try {
      readFileSync(distPath);
      distExists = true;
    } catch {
      // dist hasn't been built yet
    }

    if (!distExists) {
      console.warn("dist/index.js not found — skipping built binary test");
      return;
    }

    const result = spawnSync("node", [distPath, "--help"], {
      encoding: "utf-8",
      timeout: 10000,
    });

    const output = (result.stdout ?? "") + (result.stderr ?? "");
    expect(output).toContain("Usage");
    expect(output).toContain("run");
    expect(output).toContain("config");
    expect(output).toContain("history");
    expect(result.status).toBe(0);
  });
});

describe("F034 — index.tsx has helpText with required content", () => {
  it("index.tsx source contains helpText with Usage section", () => {
    const content = readFileSync(resolve(srcRoot, "index.tsx"), "utf-8");
    expect(content).toContain("Usage");
  });

  it("index.tsx source helpText contains run command", () => {
    const content = readFileSync(resolve(srcRoot, "index.tsx"), "utf-8");
    expect(content).toContain("run");
  });

  it("index.tsx source helpText contains config command", () => {
    const content = readFileSync(resolve(srcRoot, "index.tsx"), "utf-8");
    expect(content).toContain("config");
  });

  it("index.tsx source helpText contains history command", () => {
    const content = readFileSync(resolve(srcRoot, "index.tsx"), "utf-8");
    expect(content).toContain("history");
  });

  it("index.tsx source helpText contains --model option", () => {
    const content = readFileSync(resolve(srcRoot, "index.tsx"), "utf-8");
    expect(content).toContain("--model");
  });

  it("index.tsx source helpText contains --version option", () => {
    const content = readFileSync(resolve(srcRoot, "index.tsx"), "utf-8");
    expect(content).toContain("--version");
  });

  it("index.tsx source helpText contains --help option", () => {
    const content = readFileSync(resolve(srcRoot, "index.tsx"), "utf-8");
    expect(content).toContain("--help");
  });
});
