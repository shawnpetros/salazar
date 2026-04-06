## Status

Salazar is being ported from Python+Node polyglot to a single TypeScript package. Plan written, branch created, ready to execute.

## In-Flight

- **TS Port (P0)**: 14 tasks, 0 complete. Plan at `docs/superpowers/plans/2026-04-06-ts-port.md`
- Brownfield, multi-orchestrator, and dashboard webhooks intentionally deferred
- Using `@anthropic-ai/claude-agent-sdk` (TS) to replace `claude-agent-sdk` (Python)

## Key Details

- Repo: github.com/shawnpetros/salazar
- Branch: `feat/ts-port` (work branch, merge to main when done)
- Agent SDK: `@anthropic-ai/claude-agent-sdk` — same `query()` API as Python
- Architecture: Single npm package, engine emits typed events, TUI subscribes directly
- Old Python (`salazar/`) and old CLI (`cli/`) stay until Task 13 cleanup

## Next Steps

1. Create `feat/ts-port` branch
2. Execute Task 1 (scaffold) through Task 14 (smoke test)
3. Tasks 3-6 and 7-9 are parallelizable
4. Merge to main when smoke test passes
