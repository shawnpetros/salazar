# Feature: `harness status` Command

## Overview

Add a `harness status` command that shows whether a harness process is currently running, and if so, displays the current session info.

## Behavior

### When a harness is running

```
$ harness status

  ⬡ Harness — Active Session

  Session:  e631f0ba2187
  Spec:     mini-jwt
  Status:   RUNNING (Generating)
  Feature:  12/38 — ES256 key pair generation
  Elapsed:  23m 15s
  PID:      92303
```

### When no harness is running

```
$ harness status

  No active harness session.

  Run: harness run <spec.md> to start one.
```

## Implementation

### How to detect a running harness

Check for a PID file at `~/.harness/current.pid`. The harness process writes its PID on start and removes it on exit.

1. Read `~/.harness/current.pid` — if missing, no session active
2. If exists, check if the PID is still alive (`kill -0 <pid>`)
3. If alive, read `~/.harness/current-session.json` for session metadata:
   ```json
   {
     "sessionId": "e631f0ba2187",
     "specPath": "/path/to/spec.md",
     "startedAt": "2026-03-28T00:00:00Z",
     "pid": 92303
   }
   ```
4. If PID is dead but files exist, clean them up (stale session)

### Files to create/modify

- `src/commands/status.tsx` — the status command handler
- `src/lib/session-state.ts` — read/write PID file and session metadata
- `src/index.tsx` — add `status` to command routing and help text

### Test scenarios

1. Given no PID file exists, when `harness status` runs, then it prints "No active harness session"
2. Given a PID file exists with a valid running PID, when `harness status` runs, then it displays session info
3. Given a PID file exists but the PID is dead, when `harness status` runs, then it cleans up stale files and prints "No active harness session"
4. Given a PID file exists but session JSON is missing, when `harness status` runs, then it handles gracefully
