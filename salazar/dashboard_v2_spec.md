# Salazar Dashboard v2

## IMPORTANT: Pre-Initialized Project

The project is ALREADY initialized. Do NOT run `create-next-app`, `npm init`, or any project scaffolding commands. The following are already installed and configured:

- Next.js 16 with App Router and TypeScript strict mode
- Tailwind CSS
- shadcn/ui (Card, Badge, Progress, ScrollArea, Separator components)
- react-markdown
- ESLint
- Git initialized

Start directly with writing components, routes, and logic. The `app/layout.tsx` and `app/page.tsx` already exist — modify them.

## Overview

A Next.js monitoring dashboard for the Salazar autonomous coding orchestrator. Shows real-time progress of running sessions, historical session data, and detailed feature/evaluator/cost breakdowns. Reads from Salazar's SQLite database locally, with optional Redis sync for remote deployment.

## Architecture

### Data Sources

**Local mode** (default): reads from `~/.salazar/salazar.db` via a lightweight API route that queries SQLite.

**Remote mode** (optional): the Python engine pushes data to a Redis instance (Upstash) via webhook. The dashboard reads from Redis. This is for monitoring remotely when the dashboard is deployed to Vercel.

Both modes use the same API shape — the dashboard components don't care where the data comes from.

### Tech Stack

- Next.js 16 with App Router
- TypeScript strict mode
- Tailwind CSS + shadcn/ui (Card, Badge, Progress, ScrollArea, Separator)
- Catppuccin Mocha dark theme
- Geist Sans + Geist Mono fonts
- react-markdown for spec descriptions
- No additional dependencies

## Theme — Catppuccin Mocha

Use these exact hex values for the dark theme:

```
Background:  #1e1e2e (Base)
Card:        #313244 (Surface0)
Card hover:  #45475a (Surface1)
Text:        #cdd6f4 (Text)
Muted text:  #9399b2 (Overlay2)
Border:      #45475a (Surface1)
Accent:      #cba6f7 (Mauve)
Blue:        #89b4fa
Green:       #a6e3a1
Pink:        #f5c2e7
Yellow:      #f9e2af
Red:         #f38ba8
```

Mono font for: numbers, SHAs, session IDs, timestamps, costs, scores.

## Routing

### `GET /` — Active Sessions

Show all running sessions as a grid of cards. If only one session is running, redirect to its detail view.

Each session card shows:
- Spec name (mauve, bold)
- Session ID (mono, muted)
- Status badge (RUNNING/green pulse, PAUSED/yellow, ERROR/red)
- Progress: X/Y features (progress bar)
- Elapsed time
- Current phase (plan/generate/validate/evaluate)

If no sessions are active, show the empty state with the Salazar serpent icon and "No active sessions. Run `salazar run <spec.md>` to start one."

### `GET /session/[id]` — Session Detail

The main monitoring view for a running or recently completed session. Layout (responsive, 12-column grid on desktop):

**Row 1 — full width:**
Spec card: project name (mauve, large) + scrollable markdown description

**Row 2 — full width:**
Status card: state (RUNNING/COMPLETE/ERROR) + phase + elapsed timer (big mono, ticks every second, freezes on complete) + current feature name (truncated to one line)

**Row 3 — full width:**
Timeline card: scrollable list of events with timestamps relative to session start, duration badges (green <5min, yellow 5-10min, red >10min), avg time/feature, total completed count. Two live counters: "total" elapsed and "current feature" elapsed.

**Row 4 — 7 cols left, 5 cols right:**
Left: Feature progress — big count (X / Y), progress bar, scrollable checklist with pass/fail icons. Completed features full opacity, pending features 62% opacity.
Right: Sprint info (iteration #, phase dot, feature name, goal) + Cost tracker (big dollar amount, per-agent breakdown bar with mauve/blue/pink dots)

**Row 5 — 5 cols left, 7 cols right:**
Left: Evaluator card — big score with glow effect (green 7+, yellow 5-7, red <5), 4 dimension bars (Spec, Quality, Security, UX), expandable feedback text in mono
Right: Commits — timeline with dots, SHA badges, message, files changed, relative timestamps

**Header:**
Sticky, backdrop-blur. Salazar icon + "Salazar" text. Session ID badge. Navigation: back arrow (if from list), "history" button. Status pill (RUNNING with green pulse / COMPLETE / ERROR).

**Footer:**
Version string ("salazar v0.1"), connection status ("SSE connected" / "SQLite local" / "disconnected").

### `GET /history` — Session History

List of completed sessions, newest first. Each row is a card showing:
- Spec name (mauve)
- Session ID (mono, muted)
- Completion date
- Features: X/Y (green count)
- Avg evaluator score (colored by threshold)
- Duration
- Total cost

Click a session to drill into `/session/[id]` with read-only historical data.

"Back to live" button returns to `/`.

### `GET /api/sessions` — API: Active + Recent Sessions

Returns JSON:
```json
{
  "active": [{ "id": "...", "spec_name": "...", "state": "running", ... }],
  "recent": [{ "id": "...", "spec_name": "...", "state": "complete", ... }]
}
```

### `GET /api/session/[id]` — API: Full Session Data

Returns JSON with all session data (status, features, timeline, evaluator, cost, commits).

### `POST /api/ingest` — API: Webhook Receiver (Remote Mode)

Same as current dashboard — receives harness pushes, writes to Redis. Requires `Authorization: Bearer <INGEST_SECRET>`.

### `GET /api/stream` — API: SSE Stream (Remote Mode)

Same as current — polls Redis every 1.5s, pushes diffs to browser via Server-Sent Events.

## Components

### `spec-card.tsx`
Project name in mauve. Description rendered with react-markdown (scrollable, max-h-24). Links in blue, code in pink on surface0 background.

### `status-card.tsx`
Two-row layout. Top: state text (large mono uppercase, color-coded) + phase with icon + elapsed timer (big mono, ticks every second, freezes on complete/error). Bottom: current feature name (one line, truncated). Subtle glow shadow matching state color.

### `timeline-card.tsx`
Header: "Timeline" + two live counters (total elapsed in blue, current feature elapsed in pink with pulse). Body: scrollable list of events. Each event: relative timestamp (blue mono), duration badge (colored by speed), label text. Footer: avg time/feature + completed count.

### `feature-progress.tsx`
Header: "Features" + big count + small total. Progress bar (blue). Scrollable checklist: completed items at full opacity with green circle-check, pending at 62% opacity with empty circle.

### `sprint-info.tsx`
Iteration badge. Phase with colored dot (mauve=plan, blue=generate, yellow=evaluate, green=validate). Feature name. Goal text.

### `evaluator-card.tsx`
Big score with drop-shadow glow. 2x2 grid of dimension bars (Spec, Quality, Security, UX) with numeric values. Expandable feedback in mono. Pass rate if available.

### `cost-tracker.tsx`
Big dollar amount. Token counts (in/out) in muted mono. Stacked bar showing planner (mauve) / generator (blue) / evaluator (pink) proportions. Dot legend with per-agent costs.

### `commit-feed.tsx`
Scrollable list with timeline dots. Each: SHA badge (mauve tint), relative timestamp, commit message (truncated), files changed count. Most recent at top.

### `session-card.tsx` (for list views)
Compact card for the active sessions list and history list. Shows key stats in a single row.

### `empty-state.tsx`
Centered layout with muted icon, message text, and command hint in mono.

## Loading States

When data is loading or the session is in the planning phase, show animated placeholder text that rotates through personality messages:

```
"Decomposing the spec..."
"Analyzing feature dependencies..."
"Calibrating the evaluator's skepticism..."
"Sharpening the validators..."
"Preparing the serpent..."
```

Rotate every 3 seconds with a fade transition.

## Directory Structure

```
dashboard-v2/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Active sessions list (or redirect to single)
│   ├── session/
│   │   └── [id]/
│   │       └── page.tsx            # Session detail view
│   ├── history/
│   │   └── page.tsx                # Completed sessions list
│   └── api/
│       ├── sessions/route.ts       # Active + recent sessions
│       ├── session/[id]/route.ts   # Full session data
│       ├── ingest/route.ts         # Webhook receiver (remote mode)
│       └── stream/route.ts         # SSE stream (remote mode)
├── components/
│   ├── spec-card.tsx
│   ├── status-card.tsx
│   ├── timeline-card.tsx
│   ├── feature-progress.tsx
│   ├── sprint-info.tsx
│   ├── evaluator-card.tsx
│   ├── cost-tracker.tsx
│   ├── commit-feed.tsx
│   ├── session-card.tsx
│   ├── empty-state.tsx
│   └── loading-messages.tsx
├── lib/
│   ├── types.ts                    # All TypeScript interfaces
│   ├── data.ts                     # Data fetching (SQLite or Redis based on env)
│   └── utils.ts                    # Formatting helpers (time, cost, etc.)
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

## Project Setup

- TypeScript strict mode
- ESM
- Vitest for testing (component rendering tests where applicable)
- Package name: `salazar-dashboard`
