# Agent-ID: Autonomous Coding Harness + Live Dashboard

An autonomous coding orchestrator that builds software end-to-end using a planner/generator/evaluator agent loop — inspired by [Anthropic's research on long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents). Paired with a real-time monitoring dashboard deployed on Vercel.

**What it builds:** The [Agent Identity Token (AIT)](harness/app_spec.md) — an open standard for AI agent identity and trust attestation. Think Okta/PAM for non-human coworkers.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     HARNESS (Python)                     │
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
│              DASHBOARD (Next.js on Vercel)                │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Real-time monitoring: status, features, timeline,  │ │
│  │ evaluator scores, cost tracking, commit feed       │ │
│  │                                                    │ │
│  │ Harness → POST /api/ingest → Redis → SSE → Browser│ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## How It Works

### The Loop

1. **Planner** reads a product spec (`app_spec.md`) and decomposes it into a feature list with BDD scenarios. Feature count scales to spec complexity (15-25 for small projects, 60-100 for large).

2. **Generator** picks the next incomplete feature, gets a fresh Claude Code session, implements it, writes tests, and commits. One feature per session — clean context every time.

3. **Hard Validators** run automatically: TypeScript type checking, ESLint, build, and test suite. The generator **cannot skip these** — if they fail, it gets the error output and retries (up to 3 attempts).

4. **Evaluator** (for moderate/complex features only) is a separate Claude session with an adversarial system prompt. It reviews the implementation against a graded rubric:
   - Spec compliance (35% weight)
   - Code quality (25%)
   - Security (25%)
   - Usability (15%)

   Minimum passing score: 7.0/10. If it fails, the generator gets structured feedback and retries.

5. **Setup and simple features skip the evaluator entirely** — validators are sufficient for config files, type definitions, and straightforward implementations. This cuts ~50% of total run time.

### Model Tiers

Different agent roles can use different models for cost/speed optimization:

```bash
python3 -m harness.main app_spec.md \
  --model-generator claude-sonnet-4-6 \   # Fast, good at coding
  --model-evaluator claude-opus-4-6       # Deep, good at critique
```

Each feature has a `complexity` field (`setup`, `simple`, `moderate`, `complex`) that determines whether the evaluator runs and which model tier applies.

### Feature Complexity Routing

| Complexity | Generator | Validators | Evaluator | Typical Time |
|---|---|---|---|---|
| `setup` | Sonnet | All 4 gates | **Skipped** | ~2-3 min |
| `simple` | Sonnet | All 4 gates | **Skipped** | ~3-4 min |
| `moderate` | Sonnet | All 4 gates | Full review | ~6-8 min |
| `complex` | Sonnet | All 4 gates | Full review (Opus) | ~8-12 min |

## Project Structure

```
agent-id/
├── harness/                    # Python autonomous coding orchestrator
│   ├── harness/
│   │   ├── main.py             # CLI entry point
│   │   ├── orchestrator.py     # Main planner→generator→evaluator loop
│   │   ├── client.py           # claude-agent-sdk client factory + model tiers
│   │   ├── security.py         # Bash command allowlist (defense-in-depth)
│   │   ├── validators.py       # Hard gates: tsc, eslint, build, test
│   │   ├── progress.py         # feature_list.json reader
│   │   ├── dashboard.py        # Webhook push to monitoring dashboard
│   │   └── agents/
│   │       ├── planner.py      # Decomposes spec → feature list
│   │       ├── generator.py    # Implements one feature per session
│   │       └── evaluator.py    # Adversarial reviewer with graded rubrics
│   ├── harness/prompts/
│   │   ├── planner.md          # System prompt for planner
│   │   ├── generator.md        # System prompt for generator
│   │   └── evaluator.md        # System prompt for evaluator (skeptic mode)
│   ├── app_spec.md             # AIT standard — what the harness builds
│   ├── test_spec.md            # Mini-JWT — small test spec for dry runs
│   └── pyproject.toml
│
├── dashboard/                  # Next.js monitoring app (Vercel)
│   ├── app/
│   │   ├── api/
│   │   │   ├── ingest/route.ts # POST: harness pushes updates here
│   │   │   ├── stream/route.ts # GET: SSE to browser (real-time)
│   │   │   └── status/route.ts # GET: full state snapshot
│   │   ├── dashboard.tsx       # Client component with SSE + state
│   │   └── layout.tsx          # Catppuccin Mocha dark theme
│   ├── components/
│   │   ├── status-card.tsx     # Running state + elapsed timer
│   │   ├── timeline-card.tsx   # Feature completion timeline + ETA
│   │   ├── feature-progress.tsx# Progress bar + feature checklist
│   │   ├── sprint-info.tsx     # Current iteration + phase
│   │   ├── evaluator-card.tsx  # Score display + dimension breakdown
│   │   ├── cost-tracker.tsx    # $ spent + per-agent breakdown
│   │   └── commit-feed.tsx     # Git commit timeline
│   └── lib/
│       ├── redis.ts            # Upstash Redis (+ in-memory fallback for dev)
│       ├── types.ts            # Shared TypeScript types
│       └── keys.ts             # Redis key helpers
│
├── output/                     # Generated code goes here (gitignored)
└── north-star.txt              # Strategic vision document
```

## Running the Harness

### Prerequisites

- Python 3.11+
- Claude Max subscription (or `ANTHROPIC_API_KEY`)
- Node.js 20+ (for the dashboard)

### Setup

```bash
# Install harness dependencies
cd harness
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

# Install dashboard dependencies
cd ../dashboard
npm install
```

### Run (with dashboard)

Terminal 1 — Dashboard:
```bash
cd dashboard
npm run dev -- -p 3001
```

Terminal 2 — Harness:
```bash
cd harness
source .venv/bin/activate
python3 -m harness.main app_spec.md \
  --dashboard-url http://localhost:3001 \
  --dashboard-secret local-dev-secret \
  -v
```

### Run (headless)

```bash
cd harness
source .venv/bin/activate
python3 -m harness.main app_spec.md -v

# Monitor via log file:
tail -f logs/harness-*.log
```

### CLI Flags

| Flag | Default | Description |
|---|---|---|
| `spec` (positional) | required | Path to the app spec file |
| `--model` | `claude-sonnet-4-6` | Default model for all roles |
| `--model-planner` | (uses --model) | Model for the planner agent |
| `--model-generator` | (uses --model) | Model for the generator agent |
| `--model-evaluator` | (uses --model) | Model for the evaluator agent |
| `--dashboard-url` | (none) | Dashboard webhook URL |
| `--dashboard-secret` | (none) | Bearer token for dashboard auth |
| `--log-file` | auto-generated | Path to log file |
| `-v` | off | Verbose (debug) logging |

## Dashboard

The monitoring dashboard shows real-time harness progress via Server-Sent Events:

- **Status card** — Running/paused/complete state, current phase, elapsed timer
- **Timeline** — Feature completion events with duration and color-coded speed
- **Feature progress** — Checklist with pass/fail, progress bar, completion count
- **Sprint info** — Current iteration, phase, feature being worked on
- **Evaluator** — Score (with glow), dimension breakdown, expandable feedback
- **Cost tracker** — Total spend, per-agent breakdown bar
- **Commit feed** — Git commit timeline from the output directory

Theme: Catppuccin Mocha with mauve/blue/pink accents.

Data flow: `Harness → POST /api/ingest → Redis → SSE /api/stream → Browser`

## What Gets Built: Agent Identity Token (AIT)

The harness's target output is the AIT standard — an open identity layer for AI agents. See [`harness/app_spec.md`](harness/app_spec.md) for the full spec.

**The problem:** Every security vendor at RSAC 2026 shipped agent security products (Cisco MCP enforcement, CrowdStrike agent discovery, Cyera data lineage) — but none share a common agent identity format.

**The solution:** A lightweight JWT profile that answers: "Which agents touched customer data, with whose approval, using what permissions, and can we shut one off in 30 seconds?"

### AIT Deliverables

1. **TypeScript SDK** (`@agent-id/sdk`) — Zero-dependency library for minting, verifying, delegating, and revoking agent identity tokens
2. **Registry & Verification Service** — Next.js API for agent registration, token issuance, revocation (kill switch), and audit trail
3. **Enforcement Middleware** — MCP + HTTP request interception that verifies agent identity at every boundary
4. **Spec Document** — IETF Internet-Draft format with JSON Schema

## Design Decisions

**Why a harness instead of just vibe-coding it?**

The Anthropic research showed that long-running AI agents fail in predictable ways: context anxiety (rushing to finish as context fills) and poor self-evaluation (approving mediocre work). The harness architecture addresses both — fresh context per feature, adversarial evaluation by a separate agent, and hard validation gates that can't be sweet-talked.

**Why skip evaluator for setup features?**

"Did npm install work?" doesn't need an LLM to verify — the build passing is proof enough. Evaluator sessions cost ~3-5 minutes each. With 40% of features being setup/simple, skipping the evaluator for those cuts total runtime roughly in half.

**Why model tiers?**

Sonnet is excellent at coding (fast, accurate, cheap). Opus is excellent at critique (deep reasoning, catches subtle issues). Using Opus only where adversarial depth matters keeps runs fast without sacrificing quality on the code that needs it most.

## References

- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic Engineering, Nov 2025 (updated March 2026)
- [claude-agent-sdk](https://github.com/anthropics/claude-agent-sdk-python) — Python SDK for programmatic Claude Code sessions
- [Anthropic autonomous-coding quickstart](https://github.com/anthropics/claude-quickstarts/tree/main/autonomous-coding) — Reference implementation
