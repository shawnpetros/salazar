import { defineConfig } from "tsup";

/**
 * tsup build configuration for harness-cli.
 *
 * Produces a single ESM bundle at dist/index.js with the shebang injected
 * so it can be executed directly as a CLI binary.
 */
export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  outDir: "dist",
  target: "node20",
  bundle: true,
  clean: true,
});
