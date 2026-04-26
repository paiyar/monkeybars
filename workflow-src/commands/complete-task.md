---
name: complete-task
description: Run checks, commit a completed task, update workflow state, and advance.
---

## When to use

Use after finishing implementation of a task from the active phase file.

## Steps

1. Run `task lint`; fix issues before proceeding.
2. Run `task typecheck`; fix issues before proceeding.
3. Run `task test`; fix issues before proceeding.
4. Review changes with `git status --short`.
5. Update the active `docs/work/phase-N.md`:
   - Set State to `in_progress` if this is the first task in the phase.
   - Check off the completed task.
   - Set Current task to the next unchecked task, or `complete` if none remain.
   - Set Last commit to the commit subject `type(TXX): description`.
   - Update test results and set WIP files to `none`.
   - Append a Log entry with what changed.
6. Update `docs/status.md` to match the phase state, current task, last commit
   subject, phase summary, and today's date.
7. Stage only files related to the completed task, including code, tests, and
   workflow tracking files.
8. Commit once with message format `type(TXX): description`.
9. Run `workflow-check`.
10. Run `context-boundary` and report whether to continue, hand off, or start a
    fresh context.

Do not try to write the final commit hash into the same commit; a commit cannot
contain its own final hash.
