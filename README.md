<p align="center">
  <img src="assets/banner.png" alt="Salazar — The tool that builds itself" width="100%" />
</p>

# Salazar

*The tool that builds itself.*

An autonomous coding orchestrator that builds software end-to-end from a markdown spec — no human code required. Planner/generator/evaluator agent loop using Claude via `@anthropic-ai/claude-agent-sdk`, with a terminal UI and contract-gated agent handoffs.

Named after the serpent — an ouroboros that eats its own tail. We pointed it at a spec for its own CLI and it built a 1,141-test terminal app in 4 hours. Then we pointed it at its own codebase in brownfield mode to add features to itself.

**Proven output:** [mini-jwt](https://github.com/AvistarAI/mini-jwt) — 38/38 features, 76 tests, 96% coverage, built in 70 minutes for $9.27.

**The meta part:** The CLI itself was built by Salazar. We wrote a spec for an Ink TUI, pointed Salazar at it, and walked away. 4 hours later: 63/63 features, 1,141 tests, fully functional CLI. The tool built its own interface.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLI / TUI (Ink)                       │
│  Onboarding, live progress, session history             │
│  Direct engine integration — no subprocess IPC          │
└──────────────────────┬──────────────────────────────────┘
                       │ imports
┌──────────────────────▼──────────────────────────────────┐
│                   ENGINE (TypeScript)                    │
│                                                         │
│  ┌──────────┐    ┌───────────┐    ┌───────────────────┐ │
│  │ Planner  │───▶│ Generator │───▶│ Hard Validators   │ │
│  │          │    │           │    │ (tsc, eslint,     │ │
│  │ Reads    │    │ Builds 1  │    │  build, test)     │ │
│  │ spec,    │    │ feature   │    │                   │ │
│  │ creates  │    │ per       │    │ Must all pass     │ │
│  │ feature  │    │ session   │    │ before proceeding │ │
│  │ list     │    │           │    └─────────┬─────────┘ │
│  └──┬───────┘    └─────▲─────┘              │           │
│     │                  │                    ▼           │
│     │ Zod              │           ┌───────────────┐    │
│     │ contract         │           │  Evaluator    │    │
│     │ gate             └───────────│  (adversarial │    │
│     │                  feedback    │   reviewer)   │    │
│     ▼                  loop        │               │    │
│  ┌──────────┐          if < 7.0    │  Zod contract │    │
│  │ Schema   │                      │  gate on      │    │
│  │ validate │                      │  output       │    │
│  │ + retry  │                      └───────────────┘    │
│  └──────────┘                                           │
│                                                         │
│  EventEmitter ──▶ TUI subscribes directly               │
│  SQLite ──▶ session history persisted locally            │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install
npm i -g salazar

# Or run directly
npx salazar

# Build from a spec
salazar run my-app-spec.md

# With model overrides
salazar run spec.md --model claude-sonnet-4-6 --model-evaluator claude-opus-4-6

# With custom output directory
salazar run spec.md --output-dir ./my-project
```

## How It Works

### The Loop

1. **Planner** reads a product spec and decomposes it into features with BDD scenarios. Output validated against Zod schema — retries if the feature list doesn't match the contract.

2. **Generator** picks the next incomplete feature, gets a fresh Claude Code session, implements it with TDD, writes tests, and updates the feature list. One feature per session — clean context every time.

3. **Hard Validators** run automatically: TypeScript type checking, ESLint, build, test suite. The generator **cannot skip these** — if they fail, it gets the error output and retries (max 3 attempts).

4. **Evaluator** (moderate/complex features only) is a separate Claude Code session with an adversarial system prompt. Scores on spec compliance (35%), code quality (25%), security (25%), usability (15%). Minimum 7.0/10 to pass. Output validated against Zod schema — retries internally up to 3 times if the evaluation can't be parsed.

5. **Setup and simple features skip the evaluator** — validators are sufficient. This cuts ~50% of total runtime.

### Contract-Gated Handoffs

Every agent-to-agent transition is validated by a Zod schema:

| Handoff | Contract | On Failure |
|---|---|---|
| Planner → Orchestrator | `FeatureListSchema` | Retry planner with schema error |
| Generator → Validators | Exit code + test output | Retry generator with failure output |
| Evaluator → Orchestrator | `EvalOutputSchema` | Retry evaluator session (up to 3x) |

Agents write what they want. Contracts enforce what we need. No prescriptive prompts — mechanical validation gates.

### Complexity Routing

| Complexity | Validators | Evaluator | Typical Time |
|---|---|---|---|
| `setup` | All gates | **Skipped** | ~2-3 min |
| `simple` | All gates | **Skipped** | ~3-4 min |
| `moderate` | All gates | Full review | ~6-8 min |
| `complex` | All gates | Full review | ~8-12 min |

### Model Tiers

```bash
salazar run spec.md \
  --model claude-sonnet-4-6 \          # Fast, good at coding
  --model-evaluator claude-opus-4-6    # Deep, good at critique
```

## Project Structure

```
salazar/
├── src/
│   ├── index.ts              # CLI entry point (meow)
│   ├── engine/
│   │   ├── orchestrator.ts   # Core loop: planner → generator → evaluator
│   │   ├── contracts.ts      # Zod schemas for agent handoff validation
│   │   ├── agents/
│   │   │   ├── planner.ts    # Spec → feature_list.json
│   │   │   ├── generator.ts  # TDD feature implementation
│   │   │   └── evaluator.ts  # Adversarial scoring rubric
│   │   ├── client.ts         # Agent SDK options factory
│   │   ├── validators.ts     # Hard gates: tsc, eslint, build, test
│   │   ├── progress.ts       # feature_list.json tracking
│   │   ├── storage.ts        # SQLite via better-sqlite3
│   │   └── security.ts       # Bash command allowlist
│   ├── tui/
│   │   ├── app.tsx           # Ink TUI
│   │   └── hooks/
│   │       └── use-engine.ts # Direct engine event subscription
│   └── lib/
│       ├── types.ts          # All shared interfaces
│       ├── events.ts         # Typed EventEmitter
│       ├── config.ts         # ~/.salazar/config.json
│       └── paths.ts          # Runtime directories
├── prompts/                  # Agent system prompts
│   ├── planner.md
│   ├── generator.md
│   └── evaluator.md
├── package.json
└── tsconfig.json
```

## The Meta Story

The harness built its own CLI. Here's what happened:

1. We wrote a spec for an [Ink](https://github.com/vadimdemedes/ink) terminal UI
2. Pointed Salazar at it: `salazar run tui_spec.md`
3. Walked away
4. **4 hours later:** 63/63 features, 1,141 tests, fully functional CLI

### Build Stats

| | mini-jwt (proof) | CLI (meta) | Counter (smoke test) |
|---|---|---|---|
| Features | 38/38 | 63/63 | 15/15 |
| Tests | 76 | 1,141 | 66 |
| Coverage | 96% | — | — |
| Time | 70 min | ~4 hours | 33 min |
| Cost | $9.27 | ~$30 | $9.79 |
| Human code | 0 lines | 0 lines | 0 lines |

## CLI Commands

```bash
salazar                           # Launch TUI
salazar run <spec.md>             # Build from spec (headless)
salazar run <spec.md> --output-dir ./out  # Custom output directory
salazar config                    # Configure models
salazar --help                    # Full help text
```

## How It's Built

Salazar is a single TypeScript npm package. The engine spawns [Claude Code](https://claude.ai/claude-code) sessions programmatically via `@anthropic-ai/claude-agent-sdk`. Each agent (planner, generator, evaluator) runs in its own Claude Code session with a focused system prompt, sandboxed tools, and a cost cap.

No raw API calls. No API keys needed. Uses your Claude Code authentication.

## References

- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic Engineering
- [@anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) — TypeScript SDK for programmatic Claude Code sessions
- [Ink](https://github.com/vadimdemedes/ink) — React for CLIs
- [mini-jwt](https://github.com/AvistarAI/mini-jwt) — First proof-of-concept output
