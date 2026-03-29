# Codebase Context — Salazar (harness-cli)

## Stack
- **Language**: TypeScript 5 (strict, ESNext, react-jsx)
- **Framework**: React 18 + Ink 5 (terminal UI)
- **CLI parser**: meow 13
- **Test runner**: Vitest 2
- **Build tool**: tsup (single ESM bundle → dist/index.js, ~38 KB)
- **Package manager**: npm (package-lock.json present)
- **Runtime target**: Node 20

## Structure
```
src/
  index.tsx          # CLI entry, meow arg parsing, command routing
  app.tsx            # Root Ink component, onboarding state machine
  commands/          # 3 files: run.tsx, config.tsx, history.tsx
  components/        # 10 Ink UI components (wizard, dashboard, header…)
  hooks/             # 3 hooks: use-harness.ts, use-log-tail.ts, use-timer.ts
  lib/               # 8 utilities: config.ts, process.ts, session-history.ts,
                     #   log-parser.ts, prereqs.ts, types.ts, …
  __tests__/         # 61 test files, 1141 tests
dist/                # Build output (gitignored)
```
- **Commands**: `run`, `config`, `config set`, `history`, `history <id>` — no `status` yet
- **Config file**: `~/.harness/config.json` (managed via `conf` + `src/lib/config.ts`)
- **No PID file / session-state module exists yet** — must be created for the spec

## Existing Scripts (package.json)
```json
"build":      "tsup"
"dev":        "tsup --watch"
"typecheck":  "tsc --noEmit"
"test":       "vitest run"
"test:watch": "vitest"
```
No `lint` script defined.

## Key Patterns
- **Auth**: None (local CLI tool)
- **Data layer**: `~/.harness/config.json` via `conf`; session records appended to config history array
- **State management**: React hooks (`use-harness`, `use-log-tail`, `use-timer`) inside Ink components
- **API style**: Spawns a Python orchestrator subprocess via `execa`; reads its stdout as newline-delimited JSON events
- **Event types**: Discriminated union in `src/lib/types.ts` (SessionStart, FeatureStart, ValidatorResult, etc.)
- **Onboarding**: State machine in app.tsx: `welcome → prereqs → config → ready`

## Conventions
- **Naming**: kebab-case files; PascalCase components/hooks; camelCase functions
- **Imports**: ESM (`import … from`); no barrel `index.ts` files
- **Tests**: Co-located under `src/__tests__/`; named with feature IDs (e.g. `run-f024.test.ts`)
- **JSX**: `.tsx` for all React files, `.ts` for pure logic
- **No lint config** (no `.eslintrc`, no `biome.json`)

## Known Issues
- **3 failing tests** in `setup.test.ts` and `version-help-f034.test.ts` — expect package name `"harness-cli"` and `bin.harness`, but package was renamed to `"salazar"` with `bin.salazar`. Pre-existing, unrelated to the status command.
- **No lint toolchain** configured.
- **No coverage config** (no `c8`, `istanbul`, or `vitest` coverage settings).
- `src/lib/session-state.ts` does not exist yet — required by spec.
