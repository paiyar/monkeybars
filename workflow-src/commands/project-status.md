---
name: project-status
description: Show current progress across all workflow phases without modifying files.
opencode_agent: plan
---

## When to use

Use when the user asks for project progress, phase status, or a read-only
summary of active work.

## Steps

1. Read `docs/agents/status.md`.
   - If present: use the Plan scope, Phase Summary table, and Active Work for
     the current task.
   - If missing: list `docs/agents/work/` and read each phase file.
2. Read the active phase file for task-level status.
3. Summarize plan scope, active phase, current task, completed vs remaining
   tasks, and blockers.
4. Run `monkeybars next` when available and include its recommended next action.
5. Report unreviewed task commits on the current branch. Read the newest file
   in `docs/agents/reviews/` (lexicographic filename sort). If none exists, skip.
   Read its `**reviewed_through:** <sha>` line; if the sha equals HEAD, skip.
   Run `git log <sha>..HEAD --oneline --no-merges` and count subjects matching
   `^[a-z]+\(T\d+\):`; if zero, skip. Derive the since-date from the filename
   prefix (`YYYY-MM-DD-`); if the filename does not match that pattern, run
   `git log -1 --format=%cs <sha>`. Print exactly
   `Unreviewed: N commits since YYYY-MM-DD.` Otherwise print nothing for this step.
6. If no phase files exist, check `docs/agents/plan.md` and report which phase should
   be started first.
7. If every phase in the active plan is complete, report that the active plan is
   exhausted and recommend `brainstorm-plan` to archive it and create the next
   active plan.
8. Do not modify files.
