# Long-Running Harness

An autonomous coding orchestrator that builds software end-to-end from a markdown spec — no human code required. Planner/generator/evaluator agent loop using Claude via `claude-agent-sdk`, with a real-time monitoring dashboard and an Ink terminal UI.

**Proven output:** [mini-jwt](https://github.com/AvistarAI/mini-jwt) — 38/38 features, 76 tests, 96% coverage, built in 70 minutes for $9.27.

**The meta part:** The CLI itself was built by the harness. We wrote a spec for an Ink TUI, pointed the harness at it, and walked away. 4 hours later: 63/63 features, 1,141 tests, fully functional CLI with onboarding wizard, live progress display, and session history. The tool built its own interface.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLI (Ink TUI / Node.js)               │
│  Onboarding wizard, live progress, session history       │
│  Built BY the harness — 63 features, 1,141 tests        │
└──────────────────────┬──────────────────────────────────┘
                       │ spawns
┌──────────────────────▼──────────────────────────────────┐
│                   HARNESS ENGINE (Python)                │
│                                                          │
│  ┌──────────┐    ┌───────────┐    ┌───────────────────┐ │
│  │ Planner  │───▶│ Generator │───▶│ Hard Validators   │ │
│  │          │    │           │    │ (tsc, eslint,     │ │
│  │ Reads    │    │ Builds 1  │    │  build, test)     │ │
│  │ spec,    │    │ feature   │    │                   │ │
│  │ creates  │    │ per       │    │ Must all pass     │ │
│  │ feature  │    │ session   │    │ before proceeding │ │
│  │ list     │    │           │    └─────────┬─────────┘ │
│  └──────────┘    └─────▲─────┘              │           │
│                        │                    ▼           │
│                        │           ┌───────────────┐    │
│                        │           │  Evaluator    │    │
│                        └───────────│  (adversarial │    │
│                     feedback loop  │   reviewer)   │    │
│                     if score < 7   │               │    │
│                                    │  Scores on:   │    │
│                                    │  - Spec (35%) │    │
│                                    │  - Quality    │    │
│                                    │  - Security   │    │
│                                    │  - Usability  │    │
│                                    └───────────────┘    │
│                                                          │
│  Pushes status via webhook ──────────────────────────▶  │
└─────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────┐
│              DASHBOARD (Next.js on Vercel)               │
│  Real-time monitoring: status, features, timeline,       │
│  evaluator scores, cost tracking, commit feed, history   │
│  Harness → POST /api/ingest → Redis → SSE → Browser     │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install the CLI
cd cli && npm install && npm link

# Run against any spec
harness run my-app-spec.md

# With model tiers
harness run spec.md --model claude-sonnet-4-6 --model-evaluator claude-opus-4-6

# With dashboard
harness run spec.md --dashboard-url https://your-dashboard.vercel.app
```

## How It Works

### The Loop

1. **Planner** reads a product spec and decomposes it into features with BDD scenarios. Feature count scales to spec complexity (10-30 small, 50-150 medium, 200-400 large).

2. **Generator** picks the next incomplete feature, gets a fresh Claude session, implements it, writes tests, commits. One feature per session — clean context every time.

3. **Hard Validators** run automatically: TypeScript type checking, ESLint, build, test suite. The generator **cannot skip these** — if they fail, it gets the error output and retries (max 3 attempts).

4. **Evaluator** (moderate/complex features only) is a separate Claude session with an adversarial system prompt. Scores on spec compliance (35%), code quality (25%), security (25%), usability (15%). Minimum 7.0/10 to pass.

5. **Setup and simple features skip the evaluator** — validators are sufficient. This cuts ~50% of total runtime.

### Complexity Routing

| Complexity | Validators | Evaluator | Typical Time |
|---|---|---|---|
| `setup` | All 4 gates | **Skipped** | ~2-3 min |
| `simple` | All 4 gates | **Skipped** | ~3-4 min |
| `moderate` | All 4 gates | Full review | ~6-8 min |
| `complex` | All 4 gates | Full review | ~8-12 min |

### Model Tiers

```bash
harness run spec.md \
  --model-generator claude-sonnet-4-6 \   # Fast, good at coding
  --model-evaluator claude-opus-4-6       # Deep, good at critique
```

## The Meta Story

The harness built its own CLI. Here's what happened:

1. We wrote a spec for an [Ink](https://github.com/vadimdemedes/ink) terminal UI (`tui_spec.md`)
2. Pointed the harness at it: `python3 -m harness.main tui_spec.md`
3. Walked away
4. **4 hours later:** 63/63 features, 1,141 tests, fully functional CLI

The CLI includes onboarding wizard, prerequisite checking, live progress rendering with timeline and evaluator scores, session history, and configuration management. All generated autonomously — the same tool that builds your software built its own user interface.

### Build Stats

| | mini-jwt (proof) | CLI (meta) |
|---|---|---|
| Features | 38/38 | 63/63 |
| Tests | 76 | 1,141 |
| Coverage | 96% | — |
| Time | 70 min | ~4 hours |
| Cost | $9.27 | ~$30 (Max) |
| Human code | 0 lines | 0 lines |

## Project Structure

```
long-running-harness/
├── cli/                    # Ink TUI — built by the harness itself
│   ├── src/
│   │   ├── index.tsx       # Entry point, CLI arg parsing
│   │   ├── app.tsx         # Root Ink app
│   │   ├── commands/       # run, config, history
│   │   ├── components/     # welcome, prereqs, progress, timeline, completion
│   │   ├── hooks/          # use-harness, use-timer, use-log-tail
│   │   └── lib/            # config, log-parser, prereqs, process, types
│   └── package.json
│
├── harness/                # Python engine
│   ├── harness/
│   │   ├── main.py         # CLI entry point
│   │   ├── orchestrator.py # Planner → generator → evaluator loop
│   │   ├── client.py       # claude-agent-sdk client + model tiers
│   │   ├── validators.py   # Hard gates: tsc, eslint, build, test
│   │   ├── agents/         # planner, generator, evaluator, architect
│   │   └── prompts/        # System prompts for each agent role
│   └── pyproject.toml
│
├── dashboard/              # Next.js monitoring app (Vercel)
│   ├── app/api/            # ingest, stream, status, history
│   ├── components/         # status, timeline, features, evaluator, cost, commits
│   └── lib/                # redis, types, keys
│
├── PROMPT.md               # Distilled prompt to replicate the harness
└── README.md
```

## Dashboard

Real-time monitoring at [agent-id-shawnpetros-projects.vercel.app](https://agent-id-shawnpetros-projects.vercel.app):

- **Status card** — running state, current phase, elapsed timer (freezes on completion)
- **Spec card** — project name + markdown description
- **Timeline** — per-feature completion events with duration and color coding
- **Feature progress** — checklist with pass/fail, progress bar
- **Evaluator** — score with glow, 4-dimension breakdown, expandable feedback
- **Cost tracker** — total spend, per-agent breakdown bar
- **Commit feed** — git commit timeline
- **Session history** — completed runs preserved for comparison

Theme: Catppuccin Mocha (mauve/blue/pink accents).

## CLI Commands

```bash
harness                     # First run → onboarding wizard
harness run <spec.md>       # Build software from spec
harness config              # Configuration wizard
harness config set model    # Set default model
harness history             # Browse past runs
harness --version           # 0.1.0
harness --help              # Full help text
```

## References

- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic Engineering
- [claude-agent-sdk](https://github.com/anthropics/claude-agent-sdk-python) — Python SDK for programmatic Claude sessions
- [Ink](https://github.com/vadimdemedes/ink) — React for CLIs
- [mini-jwt](https://github.com/AvistarAI/mini-jwt) — First proof-of-concept output
