# [Project Name] — Agent Instructions

## Project Overview

[Describe what the project does, who uses it, and the problem it solves.]

**Status:** See `docs/status.md` and the active `docs/work/phase-N.md`.

## Key Docs

- `docs/plan.md` — build phases, task breakdown, and technical decisions
- `docs/status.md` — active phase and current task
- `docs/work/phase-N.md` — task checklist, blockers, WIP, and log

## Workflow

- Start sessions with `/start-session`.
- Finish completed tasks with `/complete-task`.
- Save incomplete work with `/handoff-session`.
- Use `/context-boundary` after a coherent chunk to decide whether to continue
  or start a fresh context.
- One task = one logical change = one commit.

## Commands

```sh
task lint
task typecheck
task test
```

## Always

- Run checks before committing.
- Keep workflow tracking files current.
- Record dirty WIP files before ending a session.

## Never

- Do not check off incomplete tasks.
- Do not auto-commit or auto-stash without user intent.
- Do not store secrets in source files.
