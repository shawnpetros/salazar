# Salazar

## Purpose

Autonomous coding orchestrator that builds software end-to-end from a markdown spec. Uses a planner/generator/evaluator agent loop via `@anthropic-ai/claude-agent-sdk` with hard validator gates (tsc, eslint, build, test). Single TypeScript package — install with `npm i -g salazar`.

## Brain Sync

Search terms: `salazar`, `autonomous coding`, `harness`, `agent loop`, `Avistar`, `coding orchestrator`

## Feature Tracker

See `features.json` for structured phase/feature tracking using STOP framework.

Current phases:
- P0: TypeScript Port (in progress)
- P1: Distribution & Install
- P2: Brownfield (future)

## Project Structure

```
salazar/
├── src/
│   ├── index.ts             # CLI entry point (meow)
│   ├── engine/
│   │   ├── orchestrator.ts  # Core loop: planner → generator → evaluator
│   │   ├── agents/          # planner.ts, generator.ts, evaluator.ts
│   │   ├── client.ts        # Agent SDK options factory
│   │   ├── validators.ts    # Node/TS validator detection + execution
│   │   ├── progress.ts      # feature_list.json R/W
│   │   ├── storage.ts       # SQLite via better-sqlite3
│   │   └── security.ts      # Bash command allowlist hook
│   ├── tui/
│   │   ├── app.tsx          # Ink TUI app
│   │   └── hooks/use-engine.ts  # Direct engine integration
│   └── lib/
│       ├── types.ts         # All shared interfaces
│       ├── paths.ts         # ~/.salazar runtime paths
│       ├── events.ts        # Typed EventEmitter
│       └── config.ts        # Config load/save
├── prompts/                 # System prompts (planner.md, generator.md, evaluator.md)
├── package.json
└── tsconfig.json
```

## Rules

- Branch workflow: work on feature branches, merge to `main` only when ready for production
- Debug logging required in all engine modules (console.log with `[module]` prefixes)
- Generated code goes into `~/.salazar/output/` by default (configurable via --output-dir)
- `@anthropic-ai/claude-agent-sdk` is the TypeScript SDK for programmatic Claude Code sessions
- Brownfield mode is intentionally deferred — greenfield only for now
