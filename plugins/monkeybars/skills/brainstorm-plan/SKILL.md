---
name: brainstorm-plan
description: Turn rough intent, existing repo state, or next-release goals into approved planning docs.
disable-model-invocation: true
---

## When to use

Use before creating or materially revising `docs/plan.md`,
`docs/prd/spec.md`, or `docs/prd/architecture.md`. Also use when
`initialize-monkeybars`, `create-phase`, or `start-session` finds missing,
vague, stale, contradictory, completed, or over-broad planning context. During
initialization, this command may run as guided planning intake when the user is
not bringing enough existing docs. After a completed release, use it to archive
the completed active plan and create the next active plan.

## Steps

1. Explore project context before asking questions:
   - `README.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/`
   - existing specs, architecture notes, plans, and phase files
   - top-level source layout, dependency manifests, and likely preflight
     commands
2. Choose the planning mode:
   - **Greenfield intake:** If the project is new, turn rough intent into
     phase-ready spec, architecture, interface, and active plan docs.
   - **Existing-doc synthesis:** If useful docs exist, map them into the
     canonical planning docs and ask only for blocking gaps.
   - **Brownfield synthesis:** If useful code exists without reliable planning
     context, document the current behavior, current architecture, known
     constraints, and preflight reality before defining target changes.
   - **Next-release planning:** If the current active plan is complete,
     superseded, or stale, archive it under
     `docs/archive/plans/YYYY-MM-DD-<scope>.md`, update living docs under
     `docs/prd/`, and write a fresh active `docs/plan.md`.
   - **Guided intake:** If docs are missing or too rough, interview the user to
     define enough product, architecture, data, interface, and preflight
     context for the first implementation phase.
   - Create optional companion docs only when the project needs them, such as
     `docs/prd/data-model.md` for persistent domain data or `docs/prd/api.md`
     for public interfaces, commands, events, or service contracts.
3. Summarize what is known, what is missing, and whether the request is small
   enough for one plan. If it spans independent subsystems, propose a smaller
   first plan instead of refining the whole project at once.
4. Ask one high-impact clarifying question at a time. Prefer concrete choices
   when they help the user answer quickly. Do not ask questions that the repo
   already answers.
5. Once intent is clear, present 2-3 viable approaches with tradeoffs and a
   recommendation.
6. Present the proposed design in readable sections and get user approval before
   writing files. Cover:
   - planning mode and active plan scope
   - current behavior and current architecture for brownfield work
   - product behavior and users
   - target architecture and components
   - data model, storage, migrations, and retention if applicable
   - APIs, commands, events, or other interfaces if applicable
   - data flow and boundaries
   - dependencies and constraints
   - testing and preflight expectations
   - acceptance criteria
7. Create or update planning docs from the bundled templates:
   - `docs/prd/spec.md`
   - `docs/prd/architecture.md`
   - optional: `docs/prd/data-model.md`
   - optional: `docs/prd/api.md`
   - `docs/plan.md`
   If replacing a completed or superseded active plan, archive the old
   `docs/plan.md` before writing the new one. Do not archive or renumber
   `docs/work/phase-N.md` files.
8. Run a planning self-review:
   - no placeholders, TODOs, or unresolved contradictions
   - scope is small enough to phase
   - each phase has a clear goal, outcome, deliverables, dependencies,
     acceptance criteria, likely files or modules, and preflight expectations
   - phase numbers in the active plan are greater than existing phase files
     unless this is the first workflow plan in the repo
   - any needed data or interface contracts are explicit enough for Phase 1
   - open questions are explicit and do not block Phase 1 unless they affect
     architecture or acceptance
9. Show the files created or updated, list remaining open questions, and hand
   off to `create-phase` when `docs/plan.md` is phase-ready.

This command may edit planning files only after the user approves the proposed
design. It must not create phase files, check off tasks, run implementation, or
commit work.

## Included Templates

Use these bundled templates when creating or updating project-local workflow files.

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