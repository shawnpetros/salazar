## Status

TypeScript port complete and smoke-tested. Single npm package replaces Python+Node polyglot. 58 unit tests, 15/15 features built in smoke test (66 generated tests). Zod contract gates added for agent handoffs.

## In-Flight

- Branch `feat/ts-port` ready to merge to main (18 commits)
- Old Python `salazar` command still in PATH via pipx — needs `pipx uninstall salazar` before merge

## Key Details

- Repo: github.com/shawnpetros/salazar
- Package: `@anthropic-ai/claude-agent-sdk` for programmatic Claude Code sessions (not raw API)
- Agent SDK `cwd` does NOT enforce file write location — absolute paths required in prompts
- Evaluator JSON parse failures fixed by Zod contract gates with internal retry (3 attempts)
- Output dir needs `git init` before builds (git commit warnings in smoke test)

## Next Steps

1. `pipx uninstall salazar` then merge feat/ts-port → main
2. Init git repo in output dir automatically (orchestrator.run())
3. Improve TUI — migrate rich components from old cli/src/components/ (progress bars, timeline, evaluator scores)
4. Explore Agent SDK `outputFormat` option for structured outputs (may eliminate need for JSON parsing entirely)
5. Brownfield mode (P2) when greenfield is solid
