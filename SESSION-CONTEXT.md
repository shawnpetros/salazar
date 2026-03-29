## Status

Salazar (renamed from "long-running harness") is functional for greenfield builds. Brownfield mode exists but has bugs that need fixing before use. Dashboard needs a v2 rethink.

## In-Flight

- Left-pad built successfully (15/15, 76 tests, 43 min, $5.47) — in examples/left-pad
- Brownfield ouroboros test failed — planner went rogue, tests broke from rename, feature_list path issues
- Dashboard shows data but has gaps (no features card during hardening, scroll issues, stale footer text)

## Key Details

- Repo: github.com/shawnpetros/salazar (renamed from long-running-harness)
- CLI binary: `salazar` (package name: salazar, was harness-cli)
- Dashboard: agent-id-shawnpetros-projects.vercel.app (still on old Vercel project name)
- Proven greenfield builds: mini-jwt (38/38), TUI (63/63), left-pad (15/15)
- Brownfield NOT ready — needs planner constraint, test count parser fix, rollback validation
- Banner image generated for branding

## Next Session: Two Priorities

### Priority 1: SQLite Storage Layer (interactive)
Replace dashboard.py webhook pushes with direct SQLite writes to ~/.salazar/salazar.db.
Schema: sessions, features, timeline, costs tables.
This is the foundation for dashboard v2 and the `salazar dashboard` local command.
DO INTERACTIVELY — it touches the core engine.

### Priority 2: Dashboard v2 (can be specced for Salazar)
New routing: / (active sessions), /session/:id (detail), /history, /history/:id
Local mode: `salazar dashboard` starts web server, reads SQLite
Remote mode: optional daemon syncs SQLite → Redis for Vercel deployment
Better UI: loading states with personality, phase pipeline viz, multi-session support
Fix commit display (only commit on feature PASS, not retries)

### Brownfield Fixes (before next brownfield attempt)
- Planner prompt: "ONLY plan features from the spec, not from codebase exploration"
- Test count parser: match "Tests N passed" not "Test Files N passed"
- Validate rollback actually works (git checkout . on failure)
- Session-scoped feature lists need more testing
