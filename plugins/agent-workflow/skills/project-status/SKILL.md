---
name: project-status
description: Show current progress across all workflow phases without modifying files.
disable-model-invocation: true
---

## When to use

Use when the user asks for project progress, phase status, or a read-only
summary of active work.

## Steps

1. Read `docs/status.md`.
   - If present: use the Phase Summary table for overview and Active Work for
     the current task.
   - If missing: list `docs/work/` and read each phase file.
2. Read the active phase file for task-level status.
3. Summarize active phase, current task, completed vs remaining tasks, and
   blockers.
4. If no phase files exist, check `docs/plan.md` and report which phase should
   be started first.
5. Do not modify files.
