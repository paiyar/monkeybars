---
name: start-session
description: Resume work from repo-tracked workflow state at the beginning of a session.
opencode_agent: plan
---

## When to use

Use at the beginning of any implementation session, or when the user asks to
continue work on the project.

## Steps

1. Read `docs/agents/status.md`.
   - If present: note the plan scope, phase file path, current task, and state.
   - If missing: list `docs/agents/work/` and read each phase file to reconstruct
     state; create `docs/agents/status.md` from the findings before continuing.
2. Read only the single phase file pointed to by `docs/agents/status.md`.
3. Cross-check: if the phase file state differs from `docs/agents/status.md`, scan
   `docs/agents/work/` forward to find the real active phase and correct
   `docs/agents/status.md`.
4. Read the Status section of the phase file to confirm the current task.
5. Surface blockers before proceeding.
6. Read the relevant phase section of `docs/agents/plan.md`. If the plan context is
   unclear, stale, contradictory, or missing a phase goal, deliverables,
   dependencies, acceptance criteria, likely files or modules, or preflight
   expectations, surface that and recommend `brainstorm-plan` before changing
   implementation files.
   If all phases in the active plan are complete, surface that the active plan
   is exhausted and recommend `brainstorm-plan` to archive it and create the
   next active plan.
7. Run `git status --short --branch` for dirty work and cheap local branch
   status. Do not run `git fetch` during normal solo development unless the
   user asks, you are about to push, release, deploy, or resume from another
   machine.
8. Run `workflow-check` and surface inconsistencies.
9. Run `monkeybars next` when available and compare its recommendation to the
   session state you found. If they differ, explain the mismatch before editing.
10. Report unreviewed task commits on the current branch. Read the newest file
   in `docs/agents/reviews/` (lexicographic filename sort). If none exists, skip.
   Read its `**reviewed_through:** <sha>` line; if the sha equals HEAD, skip.
   Run `git log <sha>..HEAD --oneline --no-merges` and count subjects matching
   `^[a-z]+\(T\d+\):`; if zero, skip. Derive the since-date from the filename
   prefix (`YYYY-MM-DD-`); if the filename does not match that pattern, run
   `git log -1 --format=%cs <sha>`. Print exactly
   `Unreviewed: N commits since YYYY-MM-DD.` Otherwise print nothing for this step.
11. Report plan scope, phase, current task, last completed work, uncommitted
   work, blockers, and next steps. Wait for user confirmation before changing
   files.
