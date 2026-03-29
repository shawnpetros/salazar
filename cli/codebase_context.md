# Codebase Context — harness-cli

## Stack
- **Language:** TypeScript (strict, ESNext/ESM)
- **UI Framework:** Ink 5 (React for terminal UIs)
- **CLI Parser:** meow 13
- **Build Tool:** tsup (bundles to `dist/index.js`, target node20)
- **Test Runner:** Vitest 2
- **Package Manager:** npm
- **Runtime:** Node.js ≥ 20

## Structure
```
src/
  index.tsx           — CLI entry: parseCli() + routeCommand()
  app.tsx             — Root Ink component
  commands/           — run.tsx, config.tsx, history.tsx  (3 commands today)
  components/         — 10 Ink UI components (dashboard, progress, timeline, etc.)
  hooks/              — use-harness.ts, use-log-tail.ts, use-timer.ts
  lib/                — config.ts, log-parser.ts, process.ts, session-history.ts,
                        history-formatter.ts, history-navigation.ts, prereqs.ts, types.ts
  __tests__/          — 61 test files, 1141 tests (feature-driven naming: *-fNNN.test.ts)
```

## Existing Scripts (package.json)
```
npm run build       → tsup
npm run dev         → tsup --watch
npm run typecheck   → tsc --noEmit
npm run test        → vitest run
npm run test:watch  → vitest
```
No `lint` script defined.

## Key Patterns
- **Auth/Config:** `~/.harness/config.json` via `conf` package; `readConfig()` / `writeConfig()` in `lib/config.ts`
- **Data Layer:** Flat JSON files (`~/.harness/`); no DB
- **State Management:** React hooks + pure reducer (`reduceEvent()` in `use-harness.ts`)
- **API Style:** Spawns Python harness subprocess via `execa`; tails log file for events
- **Event Bus:** Discriminated union `HarnessEvent` (9 variants) parsed from orchestrator log lines
- **Routing:** Manual `if/else` dispatch in `routeCommand()` in `index.tsx`

## Conventions
- **Naming:** camelCase files in `lib/`; kebab-case component files; `*-fNNN.test.ts` for feature tests
- **Imports:** ESM (`import/export`); no barrel `index.ts` files
- **JSX:** Only in `.tsx` files; Ink components render to stdout
- **Tests:** Pure-function unit tests; component tests via `ink`'s `render()`; mock fs for config tests
- **Feature flags:** Feature numbers (F001–F059+) tracked in test filenames

## Known Issues
- No `lint` script — ESLint not configured
- No coverage reporting configured (no `vitest.config.ts`, no `c8`/`istanbul` setup)
- No tests yet for `src/commands/status.tsx` or `src/lib/session-state.ts` (files don't exist yet)
