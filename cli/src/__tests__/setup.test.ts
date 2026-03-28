/**
 * F001 — Project initialization tests
 *
 * Verifies that package.json is correctly configured with:
 *  - name: harness-cli
 *  - version: 0.1.0
 *  - type: module (ESM)
 *  - bin field pointing harness → ./dist/index.js
 *  - all required runtime dependencies present
 *  - all required dev dependencies present
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

/** Parse and return the cli/package.json as a plain object. */
function readPackageJson(): Record<string, unknown> {
  const pkgPath = resolve(root, "package.json");
  return JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
}

/** Parse and return the cli/tsconfig.json as a plain object. */
function readTsConfig(): Record<string, unknown> {
  const tscPath = resolve(root, "tsconfig.json");
  return JSON.parse(readFileSync(tscPath, "utf-8")) as Record<string, unknown>;
}

describe("F001 — package.json structure", () => {
  it("has name harness-cli", () => {
    const pkg = readPackageJson();
    expect(pkg["name"]).toBe("harness-cli");
  });

  it("has version 0.1.0", () => {
    const pkg = readPackageJson();
    expect(pkg["version"]).toBe("0.1.0");
  });

  it('has type "module" for ESM output', () => {
    const pkg = readPackageJson();
    expect(pkg["type"]).toBe("module");
  });

  it('has bin field mapping "harness" → "./dist/index.js"', () => {
    const pkg = readPackageJson();
    const bin = pkg["bin"] as Record<string, string>;
    expect(bin).toBeDefined();
    expect(bin["harness"]).toBe("./dist/index.js");
  });

  it("includes all required runtime dependencies", () => {
    const pkg = readPackageJson();
    const deps = pkg["dependencies"] as Record<string, string>;
    const required = [
      "ink",
      "ink-text-input",
      "ink-select-input",
      "ink-spinner",
      "ink-big-text",
      "ink-gradient",
      "ink-box",
      "react",
      "meow",
      "conf",
      "chalk",
      "figures",
      "execa",
    ];
    for (const dep of required) {
      expect(deps[dep], `Missing dependency: ${dep}`).toBeDefined();
    }
  });

  it("includes required dev dependencies", () => {
    const pkg = readPackageJson();
    const devDeps = pkg["devDependencies"] as Record<string, string>;
    const required = ["typescript", "tsup", "@types/react", "@types/node"];
    for (const dep of required) {
      expect(devDeps[dep], `Missing devDependency: ${dep}`).toBeDefined();
    }
  });

  it("has a build script", () => {
    const pkg = readPackageJson();
    const scripts = pkg["scripts"] as Record<string, string>;
    expect(scripts["build"]).toBeDefined();
  });

  it("has a test script", () => {
    const pkg = readPackageJson();
    const scripts = pkg["scripts"] as Record<string, string>;
    expect(scripts["test"]).toBeDefined();
  });
});

describe("F001 — tsconfig.json structure", () => {
  it("exists at cli/tsconfig.json", () => {
    expect(existsSync(resolve(root, "tsconfig.json"))).toBe(true);
  });

  it("enables strict mode", () => {
    const tsc = readTsConfig();
    const opts = tsc["compilerOptions"] as Record<string, unknown>;
    expect(opts["strict"]).toBe(true);
  });

  it("uses react-jsx for JSX transform", () => {
    const tsc = readTsConfig();
    const opts = tsc["compilerOptions"] as Record<string, unknown>;
    expect(opts["jsx"]).toBe("react-jsx");
  });

  it("targets ESNext module format", () => {
    const tsc = readTsConfig();
    const opts = tsc["compilerOptions"] as Record<string, unknown>;
    expect(opts["module"]).toBe("ESNext");
  });
});

describe("F001 — directory structure", () => {
  const dirs = [
    "src",
    "src/commands",
    "src/components",
    "src/lib",
    "src/hooks",
  ];

  for (const dir of dirs) {
    it(`directory ${dir}/ exists`, () => {
      expect(existsSync(resolve(root, dir))).toBe(true);
    });
  }

  it("node_modules exists (npm install ran successfully)", () => {
    expect(existsSync(resolve(root, "node_modules"))).toBe(true);
  });

  it("node_modules/ink is installed", () => {
    expect(existsSync(resolve(root, "node_modules/ink"))).toBe(true);
  });

  it("node_modules/react is installed", () => {
    expect(existsSync(resolve(root, "node_modules/react"))).toBe(true);
  });
});
