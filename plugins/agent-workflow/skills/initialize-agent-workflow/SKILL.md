---
name: initialize-agent-workflow
description: Initialize or adopt repo-local agent workflow files in the current project.
disable-model-invocation: true
---

## When to use

Use inside a target project after installing the global plugin. This command is
the opt-in step that creates or updates project-local workflow files for a new
project, an existing repo, or an existing workflow that needs a next active
plan.

## Steps

1. Confirm the current directory is a git repository.
2. Inspect existing project context:
   - `README.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/`
   - top-level code structure and likely tech stack
   - existing preflight or verification commands
3. Run a planning intake and choose the initialization path:
   - **Greenfield path:** If the repo is new or mostly empty, map available
     intent into the canonical planning docs and create the first active plan.
   - **Brownfield adoption path:** If useful code already exists, document the
     current behavior, current architecture, stack conventions, and known
     risks before proposing target changes. Preserve working behavior and
     project-specific constraints instead of replacing them with generic
     template text.
   - **Bring-your-own-docs path:** If existing docs are sufficient, summarize
     the discovered sources and map them into the canonical workflow docs.
     Preserve source-specific decisions instead of replacing them with generic
     template text.
   - **Next-release path:** If workflow files already exist and the active plan
     is complete or stale, summarize current status and run `brainstorm-plan`
     to archive the completed plan and define the next active `docs/plan.md`.
   - **Guided initialization path:** If planning inputs are missing, vague,
     contradictory, stale, or too broad to split into phase tasks, run
     `brainstorm-plan` before creating `docs/plan.md` or
     `docs/work/phase-1.md`.
   - Ask only for blocking details the repo does not already answer. Prefer one
     concrete question at a time.
4. Determine the project preflight checks: the commands that should pass before
   a completed task is committed. Prefer existing project commands from README,
   AGENTS, package scripts, Makefile, Justfile, Taskfile, Cargo, Go, Python, or
   similar stack conventions. Preflight may include linting, static analysis,
   typechecking, tests, build, migrations, or smoke checks.
5. If no command surface exists, offer to create a minimal `Taskfile.yml` shim
   for the discovered stack. Do not require Taskfile when another runner is
   already present.
6. When planning inputs are sufficient, create missing planning structure from
   the bundled templates:
   - `docs/prd/spec.md`
   - `docs/prd/architecture.md`
   - optional companion docs under `docs/prd/`, such as `data-model.md` or
     `api.md`, only when the project needs that detail
   - `docs/plan.md`
7. Create or update `AGENTS.md` with the workflow rules and documented
   preflight checks. Preserve existing project-specific instructions.
8. If the user is using Claude Code, create or update `CLAUDE.md` so it
   references `AGENTS.md`.
9. Create `docs/status.md` from the status template if missing. Set `Plan
   scope` to the active project, adoption, stabilization, or release scope.
10. Create the first missing `docs/work/phase-N.md` from `docs/plan.md` only
    when the phase is phase-ready. Use the next available global phase number;
    do not reuse old phase numbers from completed work.
11. Install project-local command adapters only if the user asks:
   - OpenCode: `.opencode/commands/`
   - Claude Code: `.claude/skills/`
12. Do not install hooks in v1. If hooks are requested later, install them as a
    separate project-local advisory hook pack.
13. Show files created or updated, then run `workflow-check`.

This command may edit project files because initialization is explicit opt-in.
It must not overwrite existing docs or agent instructions without preserving
their project-specific content.

## Included Templates

Use these bundled templates when creating or updating project-local workflow files.

### `templates/agents.md`

````markdown
# [Project Name] — Agent Instructions

## Project Overview

[Describe what the project does, who uses it, and the problem it solves.]

**Status:** See `docs/status.md` and the active `docs/work/phase-N.md`.

## Key Docs

- `docs/prd/spec.md` — product behavior, users, requirements, and acceptance
- `docs/prd/architecture.md` — system shape, components, interfaces, and risks
- `docs/prd/*.md` — optional focused docs such as data model or API contracts
- `docs/plan.md` — active implementation plan for the current work slice
- `docs/status.md` — active phase and current task
- `docs/work/phase-N.md` — task checklist, blockers, WIP, and log
- `docs/archive/plans/` — completed or superseded active plans

## Workflow

- Start sessions with `/start-session`.
- Use `/brainstorm-plan` before creating or materially changing planning docs
  when requirements are vague, missing, contradictory, or too broad.
- For brownfield work, document current behavior and constraints before target
  changes.
- When the active plan is complete, archive `docs/plan.md` under
  `docs/archive/plans/`, write a fresh active plan, and keep phase numbers
  increasing.
- Finish completed tasks with `/complete-task`.
- Save incomplete work with `/handoff-session`.
- Use `/context-boundary` after a coherent chunk to decide whether to continue
  or start a fresh context.
- One task = one logical change = one commit.

## Preflight Checks

Document the commands that must pass before `/complete-task` commits work.
Use the project’s native runner; Taskfile is optional.

```sh
[fill in project-specific checks, for example: npm test, cargo test, go test ./..., make test]
```

## Always

- Run preflight checks before committing.
- Keep workflow tracking files current.
- Record dirty WIP files before ending a session.

## Never

- Do not check off incomplete tasks.
- Do not auto-commit or auto-stash without user intent.
- Do not store secrets in source files.
````

### `templates/claude.md`

```markdown
@AGENTS.md

# Claude

Use the agent workflow commands for session state:

- `/start-session`
- `/complete-task`
- `/handoff-session`
- `/workflow-check`
- `/context-boundary`

Detailed project conventions belong in `AGENTS.md`.
```

### `templates/spec.md`

```markdown
# Product Spec

> Last updated: YYYY-MM-DD

## Problem

[What problem this project or feature solves, and for whom.]

## Current State

[For brownfield work, summarize what exists today, what must keep working, and
what is known to be unreliable. Use `n/a` for greenfield work.]

## Target Outcome

[What should be true after this active plan or release is complete.]

## Goals

- [Primary user-visible outcome]
- [Secondary outcome]

## Non-Goals

- [Explicitly out of scope]

## Users And Workflows

- **User:** [role]
- **Workflow:** [what they do from start to finish]

## Requirements

- [Functional requirement with acceptance signal]
- [Functional requirement with acceptance signal]

## Acceptance Criteria

- [Observable behavior that proves the work is complete]
- [Observable behavior that proves the work is complete]

## Open Questions

- [Question, owner, and whether it blocks Phase 1]
```

### `templates/architecture.md`

```markdown
# Architecture

> Last updated: YYYY-MM-DD

## Current Architecture

[For brownfield work, summarize the current system shape, runtime boundaries,
important constraints, and known weak spots. Use `n/a` for greenfield work.]

## Target Architecture

[Short description of the system shape and primary runtime boundaries.]

## Components

- **[Component]:** [responsibility, inputs, outputs]
- **[Component]:** [responsibility, inputs, outputs]

## Data Flow

1. [Input or event]
2. [Processing step]
3. [Output or persisted state]

## Interfaces

- **[Interface/API/file/schema]:** [contract and caller]

## Constraints

- [Technical, product, deployment, compatibility, or operational constraint]

## Testing Strategy

- [Unit/integration/smoke approach]
- [Project preflight command or expected check]

## Risks

- [Risk and mitigation]
```

### `templates/data-model.md`

```markdown
# Data Model

> Last updated: YYYY-MM-DD

## Overview

[Short description of the domain data and where it is stored.]

## Entities

- **[Entity]:** [purpose, key fields, owner, lifecycle]
- **[Entity]:** [purpose, key fields, owner, lifecycle]

## Relationships

- **[Entity] -> [Entity]:** [cardinality, ownership, deletion behavior]

## Storage And Migrations

- **Storage:** [database, files, external system, or in-memory state]
- **Migrations:** [how schema changes are created, tested, and applied]
- **Seed/Test data:** [fixtures, factories, or sample data expectations]

## Validation And Constraints

- [Invariant, uniqueness rule, range, permission, retention, or consistency rule]

## Open Questions

- [Question, owner, and whether it blocks Phase 1]
```

### `templates/api.md`

```markdown
# Interface And API Contracts

> Last updated: YYYY-MM-DD

## Overview

[Short description of the public interfaces, callers, and compatibility expectations.]

## Interfaces

- **[Interface/API/command/event]:** [caller, responsibility, stability]
- **[Interface/API/command/event]:** [caller, responsibility, stability]

## Contracts

- **[Operation]:** [input, output, errors, side effects]
- **[Operation]:** [input, output, errors, side effects]

## Auth And Permissions

- [Authentication, authorization, tenancy, or capability rule]

## Compatibility And Versioning

- [Backward compatibility, migration, deprecation, or rollout expectation]

## Open Questions

- [Question, owner, and whether it blocks Phase 1]
```

### `templates/plan.md`

```markdown
# Implementation Plan

> Source: `docs/prd/spec.md`, `docs/prd/architecture.md`, and any companion docs under `docs/prd/`
> Last updated: YYYY-MM-DD

## Plan Scope

[Active work slice, release, stabilization effort, or adoption scope.]

## Plan Lifecycle

This is the active implementation plan. When it is complete, archive it to
`docs/archive/plans/YYYY-MM-DD-<scope>.md`, then write a fresh `docs/plan.md`
for the next active scope. Do not archive or renumber `docs/work/phase-N.md`
files. New phases must use the next available global phase number.

## Phase 1 — [Title]

- **Goal:** [One sentence describing the phase outcome]
- **User-visible outcome:** [What works after this phase]
- **Deliverables:**
  - [Deliverable]
  - [Deliverable]
- **Likely files/modules:** [Paths or areas expected to change]
- **Dependencies:** [Prior work, decisions, or external dependencies]
- **Acceptance criteria:**
  - [Observable completion signal]
  - [Observable completion signal]
- **Preflight:** [Commands expected before commit]
- **Open questions:** [none, or question and whether it blocks this phase]

## Phase 2 — [Title]

- **Goal:** [One sentence describing the phase outcome]
- **User-visible outcome:** [What works after this phase]
- **Deliverables:**
  - [Deliverable]
- **Likely files/modules:** [Paths or areas expected to change]
- **Dependencies:** [Prior phase or decision]
- **Acceptance criteria:**
  - [Observable completion signal]
- **Preflight:** [Commands expected before commit]
- **Open questions:** [none, or question and whether it blocks this phase]
```

### `templates/status.md`

```markdown
# Project Status

> Last updated: YYYY-MM-DD

## Active Work

- **Plan scope:** [active plan, release, stabilization, or adoption scope]
- **Phase file:** docs/work/phase-1.md
- **Phase:** 1 — [Title]
- **State:** not_started
- **Current task:** T01 — [description]
- **Last commit:** none

## Phase Summary

| Phase | Title | State |
|---|---|---|
| 1 | [Title] | not_started |
```

### `templates/phase.md`

```markdown
# Phase N — [Title]

> Source: active docs/plan.md, Phase N

## Goal

[One sentence from the implementation plan]

## Acceptance

- [Observable completion signal from docs/plan.md]
- [Preflight command or verification expected for this phase]

## Status

- **State:** not_started
- **Current task:** T01 — [first task description]
- **Last commit:** none
- **Preflight:** n/a
- **Blockers:** none
- **WIP files:** none

## Tasks

- [ ] T01 — [description] | files: [key files] | verify: [command]
  - Acceptance: [observable task completion signal]
- [ ] T02 — [description] | files: [key files] | verify: [command]
  - Acceptance: [observable task completion signal]

## Log

(Append dated entries as work progresses)
```