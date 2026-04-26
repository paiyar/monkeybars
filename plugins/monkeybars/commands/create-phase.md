---
description: Create the next phase work file from docs/plan.md.
---

## When to use

Use when starting a new phase and no `docs/work/phase-N.md` file exists for it
yet. Typically this follows completion of the previous phase. For post-v1 or
next-release work, create a fresh active `docs/plan.md` first and keep phase
numbers increasing across the repo.

## Steps

1. Read `docs/plan.md` to identify the next phase that needs a work file.
2. Check `docs/work/` for existing phase files to avoid duplicates and find the
   highest existing phase number.
3. Confirm the next phase is phase-ready. It must have a clear goal,
   user-visible outcome, deliverables, likely files or modules, dependencies,
   acceptance criteria, and preflight expectations. If not, stop and recommend
   `brainstorm-plan` instead of inventing missing planning details.
4. Confirm the phase number in `docs/plan.md` is greater than every existing
   phase file number. If the active plan reuses an old number, stop and
   recommend `brainstorm-plan` to renumber the active plan before creating a
   phase file.
5. Extract phase number, title, goal, deliverables, likely files or modules,
   dependencies, acceptance criteria, and preflight expectations.
6. Create `docs/work/phase-N.md` from the phase template.
7. Split deliverables into tasks where each task is one logical commit.
   Include likely files, verification, and acceptance notes for each task.
8. Update `docs/status.md`:
   - Preserve or set the active `Plan scope`.
   - Append a Phase Summary row with state `not_started`.
   - Update Active Work to the new phase file, state, and first task.
   - Set `Last updated` to today's date.
9. Show the created phase file to the user for review before proceeding.

## Task sizing

- One task = one logical change = one commit.
- Split tasks touching more than five files across unrelated domains.
- Tests can be bundled with the code they test or kept as a separate task.
- Scaffolding and config changes should be their own task.

## Included Templates

Use these bundled templates when creating or updating project-local workflow files.

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