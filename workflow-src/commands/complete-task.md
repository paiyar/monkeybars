---
name: complete-task
description: Run preflight checks, commit a completed task, update workflow state, and advance.
---

## When to use

Use after finishing implementation of a task from the active phase file.

## Steps

1. Run `monkeybars preflight`; fix failures before proceeding.
2. Review changes with `git status --short`.
3. Choose the commit subject before modifying tracking files, using message
   format `type(TXX): description`.
4. Run `monkeybars advance --task TXX --commit "type(TXX): description"`.
   This updates the active phase file and `docs/agents/status.md` before the commit.
5. Stage only files related to the completed task, including code, tests, and
   workflow tracking files.
6. Commit once with the same subject passed to `monkeybars advance`.
7. Run `monkeybars check`.
8. Run `context-boundary` and report whether to continue, hand off, or start a
    fresh context.
9. If this completes the last phase in the active `docs/agents/plan.md`, report that
    the active plan is exhausted and the next planning step is `brainstorm-plan`
    to archive it and create the next active plan.

Do not run `monkeybars advance` after the commit. The tracking update belongs
in the same logical task commit as the code and tests.
