---
name: create-phase
description: Create the next phase work file from docs/agents/plan.md.
include_templates: plan, status, phase
---

## When to use

Use when starting a new phase and no `docs/agents/work/phase-N.md` file exists for it
yet. Typically this follows completion of the previous phase. For post-v1 or
next-release work, create a fresh active `docs/agents/plan.md` first and keep phase
numbers increasing across the repo.

## Steps

1. Read `docs/agents/plan.md` to identify the next phase that needs a work file.
2. Check `docs/agents/work/` for existing phase files to avoid duplicates and find the
   highest existing phase number.
3. Confirm the next phase is phase-ready. It must have a clear goal,
   user-visible outcome, deliverables, likely files or modules, dependencies,
   acceptance criteria, and preflight expectations. If not, stop and recommend
   `brainstorm-plan` instead of inventing missing planning details.
4. Confirm the phase number in `docs/agents/plan.md` is greater than every existing
   phase file number. If the active plan reuses an old number, stop and
   recommend `brainstorm-plan` to renumber the active plan before creating a
   phase file.
5. Extract phase number, title, goal, deliverables, likely files or modules,
   dependencies, acceptance criteria, and preflight expectations.
6. Create `docs/agents/work/phase-N.md` from the phase template.
7. Split deliverables into tasks where each task is one logical commit.
   Include likely files, verification, and acceptance notes for each task.
8. Add a Coverage section that maps the phase goal, deliverables, and
   acceptance criteria from `docs/agents/plan.md` to the task ids that cover them. If
   any required plan item is not covered, stop and revise the task split before
   updating status.
9. Update `docs/agents/status.md`:
   - Preserve or set the active `Plan scope`.
   - Append a Phase Summary row with state `not_started`.
   - Update Active Work to the new phase file, state, and first task.
   - Set `Last updated` to today's date.
10. Show the created phase file to the user for review before proceeding.

## Task sizing

- One task = one logical change = one commit.
- Split tasks touching more than five files across unrelated domains.
- Tests can be bundled with the code they test or kept as a separate task.
- Scaffolding and config changes should be their own task.
