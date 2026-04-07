# Salazar Product Spec

Salazar is evolving from a repo-local autonomous coding harness into an installable product. A user should be able to install it with a package manager such as Homebrew, run `salazar` from any directory, and get a complete TUI-first workflow without needing the source tree.

## Product Goals

- Make Salazar feel like a self-contained application, not a developer script.
- Package the Python runtime and the Ink TUI together behind one `salazar` command.
- Default to a new-build workflow when launched with no arguments.
- Keep internal runtime state in a stable app home such as `~/.salazar`.
- Let users choose where generated projects and specs live on disk.
- Preserve an opinionated UX while keeping core paths configurable.

## Primary User Flow

When a user launches `salazar`, the default assumption should be that they want to start a new build.

The TUI should guide them through:

1. Onboarding and initial configuration.
2. Choosing where the generated project should be created.
3. Writing or refining the product spec inside the TUI.
4. Confirming the spec path and target build directory.
5. Starting the run and monitoring progress live.

The launcher should still expose history, config, and existing-spec runs, but `New Build` should be the obvious primary path.

## Installation & Packaging

Salazar should support a simple install story such as:

- `brew install salazar`
- or another one-line package-manager-driven install that delivers the same result

The install must provide:

- the Python engine
- the Ink TUI
- one stable `salazar` executable

The installed product must not depend on the repo checkout or repo-relative paths.

## Runtime State & User Files

Salazar needs a clear separation between internal runtime state and user-authored/generated project files.

### Internal runtime state

By default, these should live under `~/.salazar`:

- config
- logs
- session history
- local database
- any internal metadata needed for orchestration

These locations should be configurable for advanced users.

### User-owned files

User-owned files should not be hidden inside the runtime state folder:

- product specs
- generated application code
- output projects

For a new build, Salazar should ask where the project should be created and then use that chosen directory as the build root.

Preferred pattern:

- the chosen target directory becomes the actual project root
- generated code lands directly there
- specs are stored in a predictable user-visible location, either inside that project or in a user-selected spec path
- runtime logs/history remain separate under `~/.salazar`

Avoid forcing a repo-centric `/output` folder convention for installed users.

## TUI Expectations

The TUI should support:

- onboarding
- config editing
- new spec authoring
- running an existing spec
- live monitoring
- history browsing
- eventually steering a run while it is in progress

The spec authoring flow should require intentional input rather than prefilled text the user has to delete. Required fields should block progression until the user provides a real value.

The run dashboard should always show:

- spec name
- spec path
- target build directory
- current phase
- progress

## Steering During Execution

One of the important future features is steering during a run.

Salazar should eventually let a user add new context mid-run and decide whether the new context can be:

- woven into remaining planned work
- deferred until later
- used to restart/replan
- skipped for the current run

If the change is expensive or disruptive, Salazar should say so clearly and present options instead of pretending the new request fits cleanly.

## Brownfield Status

Brownfield mode should be removed from the main supported product flow for now.

Reason:

- it failed badly on real project scaffolds
- it is not reliable enough to present as a primary product capability

If brownfield is brought back later, it should first support:

- common ignore patterns like `node_modules`, Python virtualenvs, caches, build output, and framework artifacts
- safer exploration of large real-world repos
- explicit experimental positioning until proven stable

## Summary

Salazar should become a self-contained, installable, TUI-first product that:

- runs from anywhere
- stores runtime state under `~/.salazar` by default
- asks the user where to build the project
- writes project files into the chosen target directory
- keeps spec authoring and monitoring inside the TUI
- de-emphasizes brownfield until it is truly production-ready
