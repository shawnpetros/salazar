# Harness CLI — Ink TUI Specification

## Overview

A terminal UI for the Long-Running Harness, built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs). Provides an onboarding wizard, live progress display, and session management — all in the terminal.

The CLI is a **wrapper** around the Python harness engine. It spawns the Python process, reads its log output, and renders a beautiful terminal UI.

## Project Setup

- TypeScript strict mode
- Ink v5 + React 18
- tsup for bundling
- Package name: `harness-cli`
- Binary name: `harness`
- ESM output

## Dependencies

```json
{
  "ink": "^5.0.0",
  "ink-text-input": "^6.0.0",
  "ink-select-input": "^6.0.0",
  "ink-spinner": "^5.0.0",
  "ink-big-text": "^2.0.0",
  "ink-gradient": "^3.0.0",
  "ink-box": "^2.0.0",
  "react": "^18.0.0",
  "meow": "^13.0.0",
  "conf": "^13.0.0",
  "chalk": "^5.0.0",
  "figures": "^6.0.0",
  "execa": "^9.0.0"
}
```

## CLI Interface

```bash
# First run — onboarding wizard
harness

# Run the harness against a spec
harness run <spec.md>
harness run <spec.md> --model claude-sonnet-4-6
harness run <spec.md> --model-evaluator claude-opus-4-6
harness run <spec.md> --dashboard-url https://your-dashboard.vercel.app
harness run <spec.md> --multi        # Use architect agent for monorepo detection
harness run <spec.md> --single       # Skip architect, single service

# Configuration
harness config                       # Open config wizard
harness config set model claude-sonnet-4-6
harness config set dashboard-url https://...
harness config set dashboard-secret abc123

# Session history
harness history                      # Show past runs
harness history <session-id>         # Show details of a specific run

# Version/help
harness --version
harness --help
```

## Onboarding Flow (First Run)

When the user runs `harness` for the first time (no `~/.harness/config.json` exists), show the onboarding wizard:

### Screen 1: Welcome

```
╭──────────────────────────────────────────╮
│                                          │
│  ⬡  Harness — Autonomous Code Builder   │
│                                          │
│  Build software from specs using AI      │
│  planner → generator → evaluator loop    │
│                                          │
╰──────────────────────────────────────────╯
```

Use `ink-big-text` or `ink-gradient` for the title. Brief description below.

### Screen 2: Prerequisites Check

```
  Checking prerequisites...

  ✓ Node.js 20+           v24.0.0
  ✓ Python 3.11+          v3.14.3
  ✓ claude-agent-sdk      v0.1.50
  ✓ Claude CLI            authenticated
  ○ Dashboard URL         (optional, configure later)

  All prerequisites met!
```

Check each prerequisite:
1. `node --version` → parse major version >= 20
2. `python3 --version` → parse major.minor >= 3.11
3. `python3 -c "import claude_agent_sdk; print(claude_agent_sdk.__version__)"` → check installed
4. `claude --version` → check CLI is available and authenticated

If any check fails, show the install command:
```
  ✗ claude-agent-sdk      not found
    → pip install claude-agent-sdk
```

### Screen 3: Configuration

```
  ? Default model for code generation
    ❯ claude-sonnet-4-6 (recommended — fast, accurate)
      claude-opus-4-6 (slower, deeper reasoning)

  ? Default model for evaluation
    ❯ claude-sonnet-4-6 (same as generator)
      claude-opus-4-6 (recommended for production)

  ? Dashboard URL (optional, press Enter to skip)
    > https://your-dashboard.vercel.app

  ? Dashboard secret (optional)
    > ••••••••••••••••
```

Use `ink-select-input` for model selection, `ink-text-input` for URLs and secrets.

### Screen 4: Ready

```
  ✓ Configuration saved to ~/.harness/config.json

  Quick start:
    harness run spec.md          Run against a spec file
    harness run spec.md --multi  Use architect for complex specs
    harness config               Change settings
    harness history              View past runs
```

## Config File

Stored at `~/.harness/config.json`:

```json
{
  "models": {
    "default": "claude-sonnet-4-6",
    "planner": null,
    "generator": null,
    "evaluator": null
  },
  "dashboard": {
    "url": null,
    "secret": null
  },
  "output": {
    "defaultDir": "./output"
  },
  "python": {
    "path": "python3",
    "venvPath": null
  },
  "history": []
}
```

## `harness run` — Live Progress View

When running `harness run spec.md`, show a live terminal UI that updates as the harness progresses:

```
  ⬡ Harness                                    ⏱ 12m 34s
  ─────────────────────────────────────────────────────
  Spec: Mini JWT Library
  Model: claude-sonnet-4-6

  Status: ● GENERATING                    Feature 8/21
  ━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░  38%

  Current: F008 — ES256 key pair generation via Web Crypto
  Phase: generate → validate → evaluate

  ┌ Timeline ──────────────────────────────────────────┐
  │ +0s      1m 46s  Planner: 21 features              │
  │ +1m 46s  2m 12s  F001 passed (validators, setup)   │
  │ +3m 58s  1m 45s  F002 passed (validators, simple)  │
  │ +5m 43s  3m 22s  F003 passed (8.5/10)              │
  │ +9m 05s  ...     F008 generating...                │
  └────────────────────────────────────────────────────┘

  Last evaluator: 8.5/10 (Spec: 9.0, Quality: 8.0, Security: 8.5, UX: 8.0)
  Cost: $1.42 (plan: $0.12, gen: $1.05, eval: $0.25)

  Press q to quit, p to pause, d to open dashboard
```

This view reads from the Python harness's log file (tail -f style) and parses the structured log lines to update the UI in real-time.

### How it works:

1. The CLI spawns the Python harness as a child process via `execa`
2. The harness writes to its log file AND optionally pushes to the dashboard
3. The CLI tails the log file and parses lines matching known patterns:
   - `[orchestrator] Starting session {id}` → set session ID
   - `[orchestrator] Iteration {n}: feature {id} ({done}/{total} done)` → update progress
   - `[orchestrator] Feature {id} PASSED` → add to timeline
   - `[validators] {name}: PASS|FAIL` → update phase indicator
   - `[evaluator] Feature {id} evaluation complete` → update evaluator display
   - `[orchestrator] Session {id} finished` → show completion summary
4. The CLI renders the UI using Ink components that re-render on state changes

### Completion Screen:

```
  ⬡ Harness — Complete!                        ⏱ 1h 10m
  ─────────────────────────────────────────────────────

  ✓ 38/38 features passed
  ✓ 76 tests, 96% coverage
  ✓ $9.27 total cost

  Output: ./output/
  Dashboard: https://your-dashboard.vercel.app

  Press Enter to exit
```

## `harness history` — Session History

```
  ⬡ Session History
  ─────────────────────────────────────────────────────

  1. mini-jwt                    38/38  8.8  70m  $9.27
     e631f0ba — Mar 27, 2026

  2. agent-id-sdk               142/150 8.2  4h   $32.15
     a7bc3d21 — Mar 28, 2026

  Use ↑↓ to navigate, Enter for details, q to quit
```

## Directory Structure

```
cli/
├── src/
│   ├── index.tsx           # Entry point, CLI arg parsing (meow)
│   ├── app.tsx             # Root Ink app component
│   ├── commands/
│   │   ├── run.tsx         # harness run <spec>
│   │   ├── config.tsx      # harness config
│   │   └── history.tsx     # harness history
│   ├── components/
│   │   ├── welcome.tsx     # Onboarding welcome screen
│   │   ├── prereqs.tsx     # Prerequisites checker
│   │   ├── config-wizard.tsx # Configuration wizard
│   │   ├── progress.tsx    # Live progress view during run
│   │   ├── timeline.tsx    # Timeline display component
│   │   ├── completion.tsx  # Run completion summary
│   │   └── header.tsx      # Shared header with timer
│   ├── lib/
│   │   ├── config.ts       # Read/write ~/.harness/config.json
│   │   ├── prereqs.ts      # Check Python, SDK, CLI availability
│   │   ├── process.ts      # Spawn and manage Python harness process
│   │   ├── log-parser.ts   # Parse harness log lines into structured events
│   │   └── types.ts        # Shared types
│   └── hooks/
│       ├── use-harness.ts  # Hook: spawn harness, track progress
│       ├── use-timer.ts    # Hook: elapsed time counter
│       └── use-log-tail.ts # Hook: tail log file, emit parsed events
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Log Parser

The log parser is the bridge between the Python harness and the TUI. It reads structured log lines and emits typed events:

```typescript
type HarnessEvent =
  | { type: "session_start"; sessionId: string; spec: string }
  | { type: "planner_complete"; features: number; durationMs: number }
  | { type: "feature_start"; id: string; name: string; iteration: number; done: number; total: number }
  | { type: "feature_complete"; id: string; score: number | null; durationMs: number; complexity: string }
  | { type: "validator_result"; name: string; passed: boolean }
  | { type: "evaluator_result"; score: number; dimensions: Record<string, number>; feedback: string }
  | { type: "cost_update"; total: number; byAgent: Record<string, number> }
  | { type: "session_complete"; totalFeatures: number; passing: number; durationMs: number; cost: number }
  | { type: "session_error"; error: string }
```

Parse patterns:
```
[orchestrator] Starting session {id}           → session_start
[orchestrator] Planner created {n} features    → planner_complete
[orchestrator] Iteration {n}: feature {id}     → feature_start
[orchestrator] Feature {id} PASSED             → feature_complete
[validators] {name}: PASS|FAIL                 → validator_result
[evaluator] Feature {id} evaluation complete   → evaluator_result
[orchestrator] Session {id} finished in {n}s   → session_complete
[orchestrator] Fatal error: {msg}              → session_error
```

## package.json bin field

```json
{
  "name": "harness-cli",
  "version": "0.1.0",
  "bin": {
    "harness": "./dist/index.js"
  }
}
```

The entry point should have `#!/usr/bin/env node` at the top.

## Key Behaviors

1. **First run detection**: Check if `~/.harness/config.json` exists. If not, show onboarding.
2. **Graceful degradation**: If Python/SDK not found, the prereqs screen shows install instructions and exits.
3. **Process management**: The harness Python process should be killed when the user presses `q` or Ctrl+C.
4. **Dashboard integration**: If a dashboard URL is configured, the `d` key opens it in the default browser.
5. **Log file**: The CLI creates the log directory if needed and passes the log path to the Python process.
6. **Exit codes**: 0 on success (all features passed), 1 on failure (features failed or harness error).
