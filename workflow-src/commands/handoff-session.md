---
name: handoff-session
description: Save current progress before ending a session.
---

## When to use

Use before ending a work session, when context is getting large, or when the
user asks to save progress for next time.

## Steps

1. Find the active phase file in `docs/work/`.
2. Run `git status --short`.
3. If the current task is complete, stop and run `complete-task` first.
4. Update the phase Status section:
   - Current task, including where work stopped.
   - Last commit from `git log -1 --oneline`.
   - Preflight status, running relevant checks if not recently run or recording
     why checks were skipped.
   - Blockers or open questions.
   - WIP files from `git status --short`, or `none`.
5. Do not check off the current task unless a completed task commit already
   exists.
6. Append a dated Log entry summarizing what was accomplished, what remains,
   dirty files, and decisions made.
7. Update `docs/status.md` to match the phase file and today's date.
8. Run `workflow-check`.
9. Show a summary of what was saved.
10. End with: `Context boundary reached. Start a fresh session next time and run /start-session.`
