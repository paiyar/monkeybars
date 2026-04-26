# [Project Name] — Agent Instructions

## Project Overview

[Describe what the project does, who uses it, and the problem it solves.]

**Status:** See `docs/status.md` and the active `docs/work/phase-N.md`.

## Key Docs

- `docs/prd/spec.md` — product behavior, users, requirements, and acceptance
- `docs/prd/architecture.md` — system shape, components, interfaces, and risks
- `docs/prd/*.md` — optional focused docs such as data model or API contracts
- `docs/plan.md` — active implementation plan for the current work slice
- `docs/status.md` — active phase and current task
- `docs/work/phase-N.md` — task checklist, blockers, WIP, and log
- `docs/archive/plans/` — completed or superseded active plans

## Workflow

- Start sessions with `/start-session`.
- Use `/brainstorm-plan` before creating or materially changing planning docs
  when requirements are vague, missing, contradictory, or too broad.
- For brownfield work, document current behavior and constraints before target
  changes.
- When the active plan is complete, archive `docs/plan.md` under
  `docs/archive/plans/`, write a fresh active plan, and keep phase numbers
  increasing.
- Finish completed tasks with `/complete-task`.
- Save incomplete work with `/handoff-session`.
- Use `/context-boundary` after a coherent chunk to decide whether to continue
  or start a fresh context.
- One task = one logical change = one commit.

## Preflight Checks

Document the commands that must pass before `/complete-task` commits work.
Use the project’s native runner; Taskfile is optional.

```sh
[fill in project-specific checks, for example: npm test, cargo test, go test ./..., make test]
```

## Always

- Run preflight checks before committing.
- Keep workflow tracking files current.
- Record dirty WIP files before ending a session.

## Never

- Do not check off incomplete tasks.
- Do not auto-commit or auto-stash without user intent.
- Do not store secrets in source files.
