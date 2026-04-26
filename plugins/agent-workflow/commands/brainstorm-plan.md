---
description: Turn rough project intent into approved planning docs before creating phase files.
agent: plan
---

## When to use

Use before creating or materially revising `docs/plan.md`,
`docs/prd/spec.md`, or `docs/prd/architecture.md`. Also use when
`initialize-agent-workflow`, `create-phase`, or `start-session` finds missing,
vague, stale, contradictory, or over-broad planning context.

## Steps

1. Explore project context before asking questions:
   - `README.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/`
   - existing specs, architecture notes, plans, and phase files
   - top-level source layout, dependency manifests, and likely preflight
     commands
2. Summarize what is known, what is missing, and whether the request is small
   enough for one plan. If it spans independent subsystems, propose a smaller
   first plan instead of refining the whole project at once.
3. Ask one high-impact clarifying question at a time. Prefer concrete choices
   when they help the user answer quickly. Do not ask questions that the repo
   already answers.
4. Once intent is clear, present 2-3 viable approaches with tradeoffs and a
   recommendation.
5. Present the proposed design in readable sections and get user approval before
   writing files. Cover:
   - product behavior and users
   - architecture and components
   - data flow and boundaries
   - dependencies and constraints
   - testing and preflight expectations
   - acceptance criteria
6. Create or update planning docs from the bundled templates:
   - `docs/prd/spec.md`
   - `docs/prd/architecture.md`
   - `docs/plan.md`
7. Run a planning self-review:
   - no placeholders, TODOs, or unresolved contradictions
   - scope is small enough to phase
   - each phase has a clear goal, outcome, deliverables, dependencies,
     acceptance criteria, likely files or modules, and preflight expectations
   - open questions are explicit and do not block Phase 1 unless they affect
     architecture or acceptance
8. Show the files created or updated, list remaining open questions, and hand
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

## Overview

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

### `templates/plan.md`

```markdown
# Implementation Plan

> Source: `docs/prd/spec.md` and `docs/prd/architecture.md`
> Last updated: YYYY-MM-DD

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