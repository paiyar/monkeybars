---
name: workflow-check
description: Validate workflow tracking files against each other and repo state.
disable-model-invocation: true
---

## When to use

Use at the end of `start-session`, `complete-task`, and `handoff-session`, or
whenever progress state looks inconsistent.

## Steps

1. Confirm the current directory is inside a git repository.
2. Confirm `docs/status.md` exists.
3. Confirm the Phase file named in `docs/status.md` exists.
4. Confirm phase number, title, state, and current task agree between
   `docs/status.md` and the active phase file.
5. Confirm current task matches checkbox state:
   - If a task is current, it should be the first unchecked task.
   - If Current task is `complete`, all tasks in that phase should be checked.
6. Confirm Last commit is `none`, a commit subject that appears in `git log`,
   or a `git log -1 --oneline` value written during handoff.
7. Run `git status --short`. If the worktree is dirty, confirm dirty files are
   documented in `WIP files` or the latest Log entry.
8. Report mismatches and the minimal correction needed. Do not modify files
   unless the command that invoked `workflow-check` is already allowed to update
   tracking files.
