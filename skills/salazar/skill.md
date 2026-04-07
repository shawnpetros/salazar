---
name: salazar
description: Autonomous coding orchestrator -- builds software from specs via planner/generator/evaluator agent loop. Use for greenfield TS/Node projects or large refactors.
---

# Salazar -- Autonomous Coding Orchestrator

Salazar builds software end-to-end from a markdown spec. It decomposes specs into features, implements each feature in its own Claude Code session with TDD, gates every feature through hard validators (tsc, eslint, build, test), and optionally scores moderate/complex features with an evaluator agent.

## When to Use Salazar

Use Salazar when the task is **large enough that autonomous execution saves real time**:

- **Greenfield projects** -- new modules, new packages, new services built from scratch
- **Large refactors** touching 5+ files with behavioral changes
- **Building from a written spec** -- markdown product spec to working code
- **When you want TDD with validator gates** -- tsc, lint, build, and test must all pass before a feature is accepted

## When NOT to Use Salazar

Do not use Salazar for small, obvious, or fast tasks:

- Quick single-file fixes or patches
- Bug fixes where the fix is obvious
- Config changes, dependency updates
- Anything you can do in under 5 minutes manually
- Adding features to an existing codebase (brownfield -- not yet supported)

## Key Constraint

Salazar currently supports **greenfield TypeScript/Node projects only**. It does not support brownfield mode (adding features to existing codebases) yet.

## How to Invoke

```bash
# Greenfield -- build from a spec
salazar run <spec.md> --output-dir <target-directory>

# With model overrides
salazar run <spec.md> --model claude-sonnet-4-6 --model-evaluator claude-opus-4-6

# Launch the TUI (interactive mode)
salazar
```

## Writing a Good Spec for Salazar

The quality of the spec directly determines the quality of the output. Follow these guidelines:

1. **Use markdown format** with clear feature descriptions
2. **Make each feature independently implementable** -- avoid features that can only work if another unfinished feature exists
3. **Include acceptance criteria or BDD scenarios** where possible (Given/When/Then)
4. **Keep it focused** -- one project per spec
5. **Salazar scales**: 10-30 features for tiny libs, 50-150 for medium SDKs

### Spec Structure Example

```markdown
# My Library

## Overview
One paragraph describing what this library does and who it's for.

## Features

### F1: Core Data Model
Description of the data model.

**Acceptance criteria:**
- Given X, when Y, then Z
- Handles edge case A

### F2: API Client
Description of the API client.

**Acceptance criteria:**
- Connects to endpoint and returns typed response
- Retries on 5xx errors with exponential backoff
```

## What Salazar Does (Under the Hood)

1. **Planner** decomposes spec into features with BDD scenarios and dependency ordering
2. **Generator** implements one feature per Claude Code session using TDD
3. **Hard validators** gate every feature -- tsc, eslint, build, and test must all pass
4. **Evaluator** scores moderate/complex features (minimum 7.0/10 to pass)
5. **Git commits** each passing feature automatically

Failed features are retried with validator feedback. The evaluator provides structured feedback on code quality, test coverage, and spec adherence.

## Cost and Time Expectations

| Project Size | Features | Time      | Estimated Cost |
|-------------|----------|-----------|----------------|
| Small lib   | ~15      | ~30 min   | $5-10          |
| Medium SDK  | ~50      | ~2 hours  | $15-30         |
| Large system| ~150     | ~6 hours  | $50-80         |

Costs depend on model selection. Using `claude-sonnet-4-6` for generation and `claude-opus-4-6` for evaluation is the recommended balance of speed and quality.

## Decision Checklist

Before invoking Salazar, confirm:

- [ ] The task is greenfield TypeScript/Node
- [ ] You have a written spec (or can write one first)
- [ ] The project has 5+ features worth automating
- [ ] You are OK with Salazar creating the project structure from scratch
- [ ] You have an `ANTHROPIC_API_KEY` set in the environment
