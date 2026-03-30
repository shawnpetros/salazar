## Status

Salazar works for TypeScript libraries. Does NOT work for Next.js/framework apps — Claude Code subprocess hangs intermittently on complex projects. Dashboard v2 build failed after multiple attempts.

## In-Flight

- Dashboard v2 spec is written but needs to be built interactively, not by the harness
- Brownfield mode has bugs (planner goes rogue, test count parser fixed, rollback added)
- Process cleanup bugs fixed (orphaned vitest, process groups)

## Key Details

- Repo: github.com/shawnpetros/salazar
- Package renamed: harness/ → salazar/, all imports updated
- SQLite storage at ~/.salazar/salazar.db (schema written, wired into orchestrator)
- Proven greenfield: mini-jwt (38/38), TUI (63/63), left-pad (15/15)
- FAILED greenfield: dashboard v2 (Next.js) — hung repeatedly on features
- Dashboard v1 live at harness-dash.shawnpetros.com (works but needs v2)
- .claudeignore needed for any project with node_modules

## Next Steps

1. Build dashboard v2 INTERACTIVELY (not with harness) — it's a framework app
2. Fix the subprocess hang issue — may need to switch from claude-agent-sdk to direct CLI spawning
3. Investigate why the SDK subprocess hangs intermittently
4. Brownfield mode fixes before next brownfield attempt
5. Astrolayb product roadmap review with Ivan
