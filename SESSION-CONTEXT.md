## Status

Published to npm as salazar-cli@1.0.0. 394 tests, local dashboard, agent skill, demo GIFs. Everything shipped.

## In-Flight

Nothing — clean slate for next session.

## Key Details

- npm: salazar-cli (binary is still `salazar`)
- Dashboard: `salazar dashboard` reads from ~/.salazar/salazar.db, port 3274
- Agent skill: `salazar install-skill` copies to .claude/skills/
- VHS tapes in demo/ for re-recording GIFs
- Old Python salazar uninstalled via pipx

## Next Steps

1. Brownfield TS/Node — explore → harden tests → scope → implement pattern
2. Dashboard remote access via Tailscale (--host 0.0.0.0) or Litestream replication
3. Bump version and republish with dashboard + skill included
4. Steering mid-run (add context while building — specs/steer-spec-while-building.md)
