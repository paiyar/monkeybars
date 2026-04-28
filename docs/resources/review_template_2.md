---
name: review-task
description: Review the current task's diff against the active plan, phase file, and repo standards before completion.
opencode_agent: plan
---

## When to use
Use after implementing the current task and before `/complete-task`, or whenever the user asks for a review of the current change.

## Steps
1. Read `docs/status.md`, the active `docs/work/phase-N.md`, and the relevant phase section of `docs/plan.md`.
2. Identify the current task, its acceptance notes, `files:` hint, and `verify:` hint.
3. Inspect `git status --short` and review the current diff. Prefer staged diff if present; otherwise review the worktree diff.
4. Pass 1: task/spec compliance.
5. Pass 2: correctness, regression risk, code quality, tests, and production risk.
6. Report only concrete findings with file references, impact, and root cause:
   - spec ambiguity
   - implementation defect
   - pre-existing unrelated issue
7. Return a verdict: approve / approve with comments / changes required / blocked by spec ambiguity.
8. Do not edit code or update workflow files.
