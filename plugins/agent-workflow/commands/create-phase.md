---
description: Create the next phase work file from docs/plan.md.
---

## When to use

Use when starting a new phase and no `docs/work/phase-N.md` file exists for it
yet. Typically this follows completion of the previous phase.

## Steps

1. Read `docs/plan.md` to identify the next phase that needs a work file.
2. Check `docs/work/` for existing phase files to avoid duplicates.
3. Extract phase number, title, goal, and deliverables.
4. Create `docs/work/phase-N.md` from the phase template.
5. Split deliverables into tasks where each task is one logical commit.
6. Update `docs/status.md`:
   - Append a Phase Summary row with state `not_started`.
   - Update Active Work to the new phase file, state, and first task.
   - Set `Last updated` to today's date.
7. Show the created phase file to the user for review before proceeding.

## Task sizing

- One task = one logical change = one commit.
- Split tasks touching more than five files across unrelated domains.
- Tests can be bundled with the code they test or kept as a separate task.
- Scaffolding and config changes should be their own task.
