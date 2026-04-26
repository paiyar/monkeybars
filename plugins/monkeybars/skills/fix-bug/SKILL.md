---
name: fix-bug
description: Interrupt current phase work cleanly for a separate bug fix.
disable-model-invocation: true
---

## When to use

Use when the user reports a bug that should be fixed separately from current
phase work. The bug description is `$ARGUMENTS`.

## Steps

1. Read the active phase file to note current state.
2. Check for uncommitted changes with `git status --short`.
3. If there are uncommitted changes, stop and ask how to preserve them before
   starting the bug fix. Recommend one of:
   - Run `handoff-session` for incomplete phase work.
   - Run `complete-task` first if the current phase task is actually complete.
   - Stash with a descriptive message only after the user explicitly approves.
4. Investigate and fix the bug described by `$ARGUMENTS`.
5. Commit the fix separately without the phase task prefix.
6. Do not mix unrelated phase/status updates into the bug commit.
7. After the bug commit, either leave the interruption note for the resumed task
   handoff or commit a separate workflow-only note if that context must be
   durable immediately.
8. Remind the user to run `start-session` to resume previous task context.
