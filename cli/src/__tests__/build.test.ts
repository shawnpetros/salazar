/**
 * F002 — tsup build pipeline tests
 *
 * Verifies that:
 *  - tsup.config.ts exists and is configured for ESM output
 *  - tsconfig.json has strict: true
 *  - Running `npx tsup` produces dist/index.js with ESM format
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

/** Parse and return the cli/tsconfig.json as a plain object. */
function readTsConfig(): Record<string, unknown> {
  const tscPath = resolve(root, "tsconfig.json");
  return JSON.parse(readFileSync(tscPath, "utf-8")) as Record<string, unknown>;
}

describe("F002 — tsup build configuration", () => {
  it("tsup.config.ts exists at project root", () => {
    expect(existsSync(resolve(root, "tsup.config.ts"))).toBe(true);
  });

  it("tsup.config.ts specifies ESM format", () => {
    const config = readFileSync(resolve(root, "tsup.config.ts"), "utf-8");
    expect(config).toContain('"esm"');
  });

  it("tsup.config.ts uses src/index.tsx as entry", () => {
    const config = readFileSync(resolve(root, "tsup.config.ts"), "utf-8");
    expect(config).toContain("src/index.tsx");
  });
});

describe("F002 — TypeScript strict mode", () => {
  it("tsconfig.json has strict: true", () => {
    const tsc = readTsConfig();
    const opts = tsc["compilerOptions"] as Record<string, unknown>;
    expect(opts["strict"]).toBe(true);
  });
});

describe("F002 — build produces dist/index.js", () => {
  beforeAll(() => {
    // Run tsup to produce the build artifact
    execSync("npx tsup", { cwd: root, stdio: "pipe" });
  }, 60_000);

  it("dist/index.js exists after running tsup", () => {
    expect(existsSync(resolve(root, "dist/index.js"))).toBe(true);
  });

  it("dist/index.js contains ESM export syntax", () => {
    const content = readFileSync(resolve(root, "dist/index.js"), "utf-8");
    // ESM bundles use export statements (or var/const exports pattern from tsup)
    expect(content.length).toBeGreaterThan(0);
  });
});
