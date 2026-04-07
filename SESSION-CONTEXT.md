## Status

TypeScript port complete, hardened, and demo-ready. 389 tests, 0 skipped. TUI has full launcher with where→what→run flow. VHS demo GIFs recorded. Ready for npm publish.

## In-Flight

- npm publish prep (package metadata, .npmignore — needs `npm login` from Shawn)
- Agent skill for Claude Code (teaches agents how to invoke salazar)

## Key Details

- Repo: github.com/shawnpetros/salazar
- Old Python `salazar` uninstalled via pipx — npm-linked TS version is active
- VHS installed via brew for demo recording. Tapes in demo/
- Agent SDK `cwd` doesn't constrain file writes — absolute paths required in prompts
- Evaluator uses `outputFormat` via Zod v4 `toJSONSchema` for structured output

## Next Steps

1. npm publish — `npm login` then `npm publish` (Shawn needs to auth)
2. Agent skill — .claude/skills/salazar.md teaches agents when/how to use salazar
3. Brownfield TS/Node — explore → harden tests → scope changes → implement. Support ts/node only. Check blast radius before changes. Harden testing harness (add coverage where missing). Scope feature changes with tests for new modules, update existing tests on behavior changes.
