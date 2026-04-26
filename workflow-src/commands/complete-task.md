---
name: complete-task
description: Run preflight checks, commit a completed task, update workflow state, and advance.
---

## When to use

Use after finishing implementation of a task from the active phase file.

## Steps

1. Read `AGENTS.md` to find the project’s documented preflight checks.
2. Run the preflight checks; fix failures before proceeding.
3. Review changes with `git status --short`.
4. Update the active `docs/work/phase-N.md`:
   - Set State to `in_progress` if this is the first task in the phase.
   - Check off the completed task.
   - Set Current task to the next unchecked task, or `complete` if none remain.
   - Set Last commit to the commit subject `type(TXX): description`.
   - Record the preflight checks that ran and set WIP files to `none`.
   - Append a Log entry with what changed.
5. Update `docs/status.md` to match the phase state, current task, last commit
   subject, phase summary, and today's date.
6. Stage only files related to the completed task, including code, tests, and
   workflow tracking files.
7. Commit once with message format `type(TXX): description`.
8. Run `workflow-check`.
9. Run `context-boundary` and report whether to continue, hand off, or start a
    fresh context.

Do not try to write the final commit hash into the same commit; a commit cannot
contain its own final hash.
