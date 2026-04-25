# Agent Workflow — Initialization Prompt

> **This document is a prompt for an LLM.**
> Copy it into any project, paste it into your coding agent, and say:
> "Initialize the agent workflow in this project."
> The agent will create every file needed to start using the workflow.
>
> For a human-readable explanation of how the workflow operates, see
> [`agent-workflow.md`](agent-workflow.md).

---

## 1. What This Sets Up

This workflow gives coding agents persistent memory across sessions. Work is
broken into phases and tasks. Progress is written into files that live in the
repo. At the start of each session, the agent reads those files and picks up
exactly where the last session ended — no chat history required.

Six commands cover the full session lifecycle:

```
start-session → [work] → complete-task → [more work?] → handoff-session
                              ↑                               |
                              └──────── next session ─────────┘
```

Plus `project-status` (read-only progress check), `create-phase` (start a new
phase), and `fix-bug` (interrupt cleanly for an urgent fix).

---

## 2. Prerequisites

Before initializing, confirm:

- **Git repo** — the project must be in a git repository
- **Task runner** — a `Taskfile.yml`, `Makefile`, or `package.json` with at
  minimum these named targets:
  - `task lint` (or equivalent) — runs the linter
  - `task typecheck` (or equivalent) — runs the type checker
  - `task test` (or equivalent) — runs the test suite
- **Agent tool** — either Claude Code or OpenCode (or both); this determines
  which skill/command files to install (see Section 8)

If a task runner doesn't exist yet, create a minimal one as part of
initialization.

---

## 3. Initialization Steps

Execute these steps in order. Ask the user for clarification when needed, but
prefer to make reasonable choices and confirm afterward.

### Step 1 — Gather project context

Read any existing documentation. Look for:
- `README.md`, `AGENTS.md`, `CLAUDE.md`, or any `docs/` files
- Existing code structure to infer tech stack, framework, and conventions

If no documentation exists, ask the user for:
- What the project does (one sentence)
- Tech stack (language, framework, database, test runner)
- The task runner and its lint/test/typecheck targets

### Step 2 — Create planning documents (if missing)

If `docs/prd/` doesn't exist, create it. Populate it with what you know:
- `docs/prd/spec.md` — product requirements (what the system does, who uses it)
- `docs/prd/architecture.md` — architectural decisions (structure, data flow)

These can be stubs — a few paragraphs each — as long as they give enough
context to write a `plan.md`.

### Step 3 — Create `docs/plan.md`

This is the master build plan. See Section 4 for the format. Derive it from
the planning documents or from the project context gathered in Step 1.

### Step 4 — Create `AGENTS.md`

Shared project instructions for all coding agents. See Section 5 for the
required sections and what each should contain.

### Step 5 — Create `docs/status.md`

The workflow bookmark. Use the template in Section 6.

### Step 6 — Create `docs/work/phase-1.md`

The first phase work file. Extract Phase 1 from `docs/plan.md`. Use the
template in Section 6.

### Step 7 — Create `CLAUDE.md` (Claude Code only)

If the user is using Claude Code, create `CLAUDE.md` at the repo root. See
Section 7 for the template.

### Step 8 — Install skill/command files

Create the skill and command files for the user's agent tool. See Section 8
for complete file contents. Ask the user which tool they use (Claude Code,
OpenCode, or both) and install accordingly.

### Step 9 — Verify and confirm

List all files created. Show the contents of `docs/status.md` and
`docs/work/phase-1.md`. Ask the user to confirm everything looks correct
before proceeding.

---

## 4. `docs/plan.md` Format

The plan is the single source of truth for build order, phases, and major
technical decisions. Every phase file is derived from it.

### Required structure

```markdown
# [Project Name] — Implementation Plan

## Overview

[2-4 sentences describing what is being built and the overall approach]

## Tech Stack

[Bullet list: language, framework, database, test runner, task runner]

## Phase 1 — [Title]

**Goal:** [One sentence — what this phase delivers]

**Deliverables:**
- [Deliverable 1]
- [Deliverable 2]
- ...

**Dependencies:** none

---

## Phase 2 — [Title]

**Goal:** [One sentence]

**Deliverables:**
- [Deliverable 1]
- ...

**Dependencies:** Phase 1 complete

---
```

### Example (two phases)

```markdown
# Inventory Tracker — Implementation Plan

## Overview

A local-first inventory management tool for small warehouses. Items are stored
in SQLite, managed via a REST API, and displayed in a React dashboard. Syncs
with a barcode scanner over USB.

## Tech Stack

- Language: TypeScript
- Runtime: Node.js 20
- Framework: Hono
- Database: SQLite via better-sqlite3 + Drizzle ORM
- Frontend: React + Vite
- Tests: Vitest
- Task runner: Taskfile

---

## Phase 1 — Foundation

**Goal:** Scaffold the project, define the database schema, and get a working
dev server with a health check endpoint.

**Deliverables:**
- Root scaffolding: `package.json`, `Taskfile.yml`, `tsconfig.json`
- SQLite schema: `items`, `locations`, `movements`, `audit_log` tables
- Drizzle client and migration runner
- Hono server with health check route
- Vitest setup with one passing test

**Dependencies:** none

---

## Phase 2 — Item Management API

**Goal:** Full CRUD for items and locations, with input validation and error
handling.

**Deliverables:**
- `GET /items`, `POST /items`, `GET /items/:id`, `PATCH /items/:id`,
  `DELETE /items/:id`
- `GET /locations`, `POST /locations`
- Zod validation on all request bodies
- 404 and 422 error responses with consistent shape
- Unit tests for all route handlers

**Dependencies:** Phase 1 complete (schema and Drizzle client must exist)
```

### Task sizing (when creating phase files from this plan)

- One task = one logical change = one commit
- Split if a deliverable touches more than 5 files across different domains
- Schema + queries + routes for the same domain can be one task
- Tests can be bundled with code or kept as a separate task
- Config and scaffolding changes should be their own task

---

## 5. `AGENTS.md` Template

`AGENTS.md` lives at the repo root. It is read by all coding agents at the
start of every session. Keep it accurate — stale instructions cause mistakes.

```markdown
# [Project Name] — Agent Instructions

## Project Overview

[1-2 sentences: what the project does, who uses it, what problem it solves]

**Status:** See `docs/work/phase-N.md` for current phase and task state.

## Key Docs

- `docs/plan.md` — Tech stack, project structure, build phases
- `docs/prd/spec.md` — Product spec
- `docs/prd/architecture.md` — System architecture

Read `docs/plan.md` before making architectural decisions.

## Tech Stack

[List each layer: Runtime, Framework, Database, Frontend, Testing, Linting,
Task runner. One item per line with a short description.]

## Commands

\`\`\`sh
task install     # install dependencies
task dev         # start dev server(s)
task build       # production build
task test        # run all tests
task lint        # lint
task typecheck   # type check
\`\`\`

[Add project-specific commands as needed]

## Project Structure

\`\`\`
[Top-level directory tree with one-line descriptions]
\`\`\`

## Code Conventions

[List the conventions that matter most for this project. Examples:]
- [Language version, strict mode settings]
- [Validation approach — e.g., Zod for all runtime validation]
- [Export style — named vs default]
- [Primary key format]
- [Money/currency representation]
- [Timestamp format]

## Architecture Rules

[List rules that agents must not break. Examples:]
- [Data flow constraints]
- [Module boundary rules]
- [What goes where]

## Workflow

Active work is tracked in `docs/work/phase-N.md`. Before starting
implementation, read the current phase file.

- One task = one logical change = one commit
- Commit messages reference the task: `feat(T03): description`
- After completing a task, check it off and update the Status section
- Before ending a session, ensure the phase file reflects current state

### Interruptions

- **Trivial** (typo, one-liner): fix inline, commit, continue current task
- **Bug fix**: use `fix-bug` — stash WIP, fix separately, resume
- **Scope change**: update the phase file, discuss with user before switching

## Always

[List things the agent must always do. Examples:]
- Run `task lint` and `task test` before committing
- Add or update tests for code you change
- Use `task typecheck` to verify no type errors

## Never

[List things the agent must never do. Examples:]
- Do not use `any` — use `unknown` and narrow with Zod
- Do not bypass validation in route handlers
- Do not store secrets in source files — use environment variables
```

---

## 6. Tracking File Templates

### `docs/status.md`

```markdown
# Project Status

> Last updated: YYYY-MM-DD

## Active Work

- **Phase file:** docs/work/phase-1.md
- **Phase:** 1 — [Title]
- **State:** not_started
- **Current task:** T01 — [description]
- **Last commit:** none

## Phase Summary

| Phase | Title | State |
|---|---|---|
| 1 | [Title] | not_started |
```

### `docs/work/phase-N.md`

```markdown
# Phase N — [Title]

> Source: docs/plan.md, Phase N

## Goal

[One sentence from the implementation plan]

## Status

- **State:** not_started
- **Current task:** T01 — [first task description]
- **Last commit:** none
- **Tests:** n/a
- **Blockers:** none

## Tasks

- [ ] T01 — [description] | [key files]
- [ ] T02 — [description] | [key files]
- [ ] T03 — [description] | [key files]

## Log

(Append dated entries as work progresses)
```

**Phase state values:** `not_started` → `in_progress` → `complete`

**Task sizing reminder:** Each task should be one commit. If a deliverable
from the plan touches too many unrelated files, split it into multiple tasks.

---

## 7. `CLAUDE.md` Template (Claude Code only)

`CLAUDE.md` lives at the repo root. Claude Code reads it at the start of every
session. Use `@AGENTS.md` to include the shared instructions, then add
tool-specific context below.

```markdown
@AGENTS.md

# Claude

## Planning

Read `docs/plan.md` before starting any new phase or making architectural
decisions.

## [Tool/Library-specific section]

[Add Claude-specific notes for major libraries in the project. Examples:
- ORM-specific commands or gotchas
- Framework-specific patterns to follow
- LLM SDK configuration details]

## Testing

[Describe the test runner, test file conventions, and minimum test requirements]
```

Keep this short. Detailed conventions belong in `AGENTS.md`. `CLAUDE.md` is
for Claude-specific guidance and library reminders that aren't obvious from
the code.

---

## 8. Skill and Command Files

Install the files for the agent tool the user is using. Ask if unsure.

### Claude Code — `.claude/skills/<name>/SKILL.md`

Create a directory for each skill. The YAML front matter is required.

---

#### `.claude/skills/start-session/SKILL.md`

```markdown
---
name: start-session
description: Protocol for starting an implementation session — reads phase status and sets up context
---

## When to use

Load this skill at the beginning of any implementation session, or when
the user asks to continue work on the project.

## Steps

1. Read `docs/status.md`
   - If present: note the phase file path, current task, and state
   - If missing: run `ls docs/work/` via bash and read each phase file to
     reconstruct state (do **not** use the glob tool — it does not reliably
     find files when given a separate path argument); then create
     `docs/status.md` from the findings before continuing
2. Read only the single phase file pointed to by `docs/status.md`
3. Cross-check: if the phase file's `State:` field differs from what
   `docs/status.md` says, scan `docs/work/` forward (read each file) to
   find the real active phase, then rewrite `docs/status.md` to correct
   the mismatch before continuing
4. Read the Status section of the phase file to confirm the current task
5. If there are blockers listed, surface them before proceeding
6. Read the relevant phase section of `docs/plan.md` for detailed context
7. Check git status for any uncommitted changes from a previous session
8. Report findings and wait for the user to confirm before making changes

## Output format

Provide a brief status report:

- **Phase:** [number and title]
- **Current task:** [T-number and description]
- **Last completed:** [what was done previously]
- **Uncommitted work:** [any stashed or dirty files]
- **Blockers:** [none, or description]
- **Next steps:** [what the current task involves]
```

---

#### `.claude/skills/complete-task/SKILL.md`

```markdown
---
name: complete-task
description: Protocol for completing a task — run checks, commit, update phase status, advance to next
---

## When to use

Load this skill after finishing implementation of a task from the phase
work file. This ensures consistent quality checks, commit messages, and
progress tracking.

## Steps

1. Run lint: `task lint` — fix any issues before proceeding
2. Run typecheck: `task typecheck` — fix any issues before proceeding
3. Run tests: `task test` — fix any issues before proceeding
4. If any checks fail, fix the issues before continuing
5. Review changes with `git status --short`
6. Stage only files related to the completed task
7. Commit with message format: `type(TXX): description`
8. Update the active phase file in `docs/work/phase-N.md`:
   - Check off the completed task checkbox
   - Update Status: current task to next task
   - Update Status: last commit hash and message
   - Update Status: test counts
   - Append to Log with what was done
9. Update `docs/status.md`:
   - Set `Current task` to the next unchecked task in the phase file
     (or `complete` if no tasks remain)
   - Set `Last commit` to the commit hash + message just made
   - Set `Last updated` to today's date (YYYY-MM-DD)
   - If the phase is now fully complete: set its row in the Phase Summary
     table to `complete`, find the next `not_started` phase, and update
     the Active Work block to point to that phase file
10. Report the next task and ask if the user wants to continue

## Commit message format

- `feat(T01): root scaffolding with taskfile and tsconfig`
- `feat(T03): drizzle schema for items and locations`
- `fix(T03): correct foreign key on movements table`
- `test(T05): unit tests for item query functions`
- `chore(T01): configure biome for linting and formatting`
```

---

#### `.claude/skills/create-phase/SKILL.md`

```markdown
---
name: create-phase
description: Create a new phase work file from the implementation plan
---

## When to use

When starting a new phase of work and no `docs/work/phase-N.md` file exists
for that phase yet. Typically used after completing the previous phase.

## Steps

1. Read `docs/plan.md` to identify the next phase that needs a work file
2. Check `docs/work/` for existing phase files to avoid duplicates
3. Extract from the plan:
   - Phase number and title
   - Goal (one sentence)
   - Deliverables broken into individual tasks
4. Create `docs/work/phase-N.md` following the template in the workflow docs
5. Each task should be one logical commit — if a plan step contains multiple
   distinct changes, split it into separate tasks
6. Update `docs/status.md`:
   - Append a new row to the Phase Summary table for the new phase with
     state `not_started`
   - Update Active Work to point to the new phase file, with state
     `not_started` and the first task as Current task
   - Set `Last updated` to today's date (YYYY-MM-DD)
7. Show the created phase file to the user for review before proceeding

## Task sizing guidelines

- One task = one logical change = one commit
- If a task touches more than 5 files across different domains, split it
- Schema, queries, and routes for the same domain can be one task
- Tests can be bundled with the code they test or be a separate task
- Scaffolding and config changes should be their own task
```

---

#### `.claude/skills/fix-bug/SKILL.md`

```markdown
---
name: fix-bug
description: Handle a bug fix interruption cleanly
---

## When to use

Load this skill when the user reports a bug that should interrupt current phase
work and be fixed separately.

## Steps

Before working on the bug described by the user:

1. Read the active phase file in `docs/work/` to note current state
2. Check for uncommitted changes with `git status --short`
3. If there are uncommitted changes, stash them with a descriptive message
4. Add a note to the phase file Log about the interruption

Then investigate and fix the bug described by the user.

After fixing, commit the fix separately without the phase task prefix, and
remind the user to run `/start-session` to resume the previous task.
```

---

#### `.claude/skills/handoff-session/SKILL.md`

```markdown
---
name: handoff-session
description: Save current progress before ending a session
---

## When to use

Load this skill before ending a work session, when context is getting large, or
when the user asks to save progress for the next session.

## Steps

1. Find the active phase file in `docs/work/`
2. Update the Status section with:
   - Current task, including where work stopped
   - Last commit from `git log -1 --oneline`
   - Test results, running `task test` if not recently run
   - Any blockers or open questions
3. Check off any tasks completed this session
4. Append a dated Log entry summarizing what was accomplished and any decisions
   made
5. Update `docs/status.md`:
   - Set `Current task` to match the phase file's current task
   - Set `Last commit` from `git log -1 --oneline`
   - Set `State` in both Active Work and the Phase Summary table to match
     the phase file's current state
   - Set `Last updated` to today's date (YYYY-MM-DD)
6. Show a summary of what was saved after updating
```

---

#### `.claude/skills/project-status/SKILL.md`

```markdown
---
name: project-status
description: Show current progress across all work phases without modifying files
---

## When to use

Load this skill when the user asks for project progress, phase status, or a
read-only summary of active work.

## Steps

1. Read `docs/status.md`
   - If present: use the Phase Summary table for an instant overview of all
     phases, and the Active Work block for the current task
   - If missing: run `ls docs/work/` via bash and read each file (do **not**
     use the glob tool — it does not reliably find files when given a separate
     path argument)
2. Read the active phase file for detailed task-level status
3. Summarize:
   - Which phase is currently active
   - Current task number and description
   - How many tasks are complete vs remaining
   - Any blockers listed
4. If no phase files exist yet, check `docs/plan.md` and report which phase
   should be started first
5. Format as a concise status report
6. Do not modify any files
```

---

### OpenCode — `.opencode/commands/<name>.md`

Plain markdown files. No directory nesting. The `description` front matter
field is required. Use `$ARGUMENTS` to pass user-supplied text into a command.

---

#### `.opencode/commands/start-session.md`

```markdown
---
description: Protocol for starting an implementation session — reads phase status and sets up context
---

## When to use

Use this command at the beginning of any implementation session, or when the
user asks to continue work on the project.

## Steps

1. Read `docs/status.md`
   - If present: note the phase file path, current task, and state
   - If missing: run `ls docs/work/` via bash and read each phase file to
     reconstruct state (do **not** use the glob tool — it does not reliably
     find files when given a separate path argument); then create
     `docs/status.md` from the findings before continuing
2. Read only the single phase file pointed to by `docs/status.md`
3. Cross-check: if the phase file's `State:` field differs from what
   `docs/status.md` says, scan `docs/work/` forward (read each file) to
   find the real active phase, then rewrite `docs/status.md` to correct
   the mismatch before continuing
4. Read the Status section of the phase file to confirm the current task
5. If there are blockers listed, surface them before proceeding
6. Read the relevant phase section of `docs/plan.md` for detailed context
7. Check git status for any uncommitted changes from a previous session
8. Report findings and wait for the user to confirm before making changes

## Output format

Provide a brief status report:

- **Phase:** [number and title]
- **Current task:** [T-number and description]
- **Last completed:** [what was done previously]
- **Uncommitted work:** [any stashed or dirty files]
- **Blockers:** [none, or description]
- **Next steps:** [what the current task involves]
```

---

#### `.opencode/commands/complete-task.md`

```markdown
---
description: Protocol for completing a task — run checks, commit, update phase status, advance to next
---

## When to use

Use this command after finishing implementation of a task from the phase work
file. This ensures consistent quality checks, commit messages, and
progress tracking.

## Steps

1. Run lint: `task lint` — fix any issues before proceeding
2. Run typecheck: `task typecheck` — fix any issues before proceeding
3. Run tests: `task test` — fix any issues before proceeding
4. If any checks fail, fix the issues before continuing
5. Review changes with `git status --short`
6. Stage only files related to the completed task
7. Commit with message format: `type(TXX): description`
8. Update the active phase file in `docs/work/phase-N.md`:
   - Check off the completed task checkbox
   - Update Status: current task to next task
   - Update Status: last commit hash and message
   - Update Status: test counts
   - Append to Log with what was done
9. Update `docs/status.md`:
   - Set `Current task` to the next unchecked task in the phase file
     (or `complete` if no tasks remain)
   - Set `Last commit` to the commit hash + message just made
   - Set `Last updated` to today's date (YYYY-MM-DD)
   - If the phase is now fully complete: set its row in the Phase Summary
     table to `complete`, find the next `not_started` phase, and update
     the Active Work block to point to that phase file
10. Report the next task and ask if the user wants to continue

## Commit message format

- `feat(T01): root scaffolding with taskfile and tsconfig`
- `feat(T03): drizzle schema for items and locations`
- `fix(T03): correct foreign key on movements table`
- `test(T05): unit tests for item query functions`
- `chore(T01): configure biome for linting and formatting`
```

---

#### `.opencode/commands/create-phase.md`

```markdown
---
description: Create a new phase work file from the implementation plan
---

## When to use

When starting a new phase of work and no `docs/work/phase-N.md` file exists
for that phase yet. Typically used after completing the previous phase.

## Steps

1. Read `docs/plan.md` to identify the next phase that needs a work file
2. Check `docs/work/` for existing phase files to avoid duplicates
3. Extract from the plan:
   - Phase number and title
   - Goal (one sentence)
   - Deliverables broken into individual tasks
4. Create `docs/work/phase-N.md` following the template in the workflow docs
5. Each task should be one logical commit — if a plan step contains multiple
   distinct changes, split it into separate tasks
6. Update `docs/status.md`:
   - Append a new row to the Phase Summary table for the new phase with
     state `not_started`
   - Update Active Work to point to the new phase file, with state
     `not_started` and the first task as Current task
   - Set `Last updated` to today's date (YYYY-MM-DD)
7. Show the created phase file to the user for review before proceeding

## Task sizing guidelines

- One task = one logical change = one commit
- If a task touches more than 5 files across different domains, split it
- Schema, queries, and routes for the same domain can be one task
- Tests can be bundled with the code they test or be a separate task
- Scaffolding and config changes should be their own task
```

---

#### `.opencode/commands/fix-bug.md`

```markdown
---
description: Handle a bug fix interruption cleanly
---

## When to use

Use this command when the user reports a bug that should interrupt current
phase work and be fixed separately.

## Steps

Before working on the bug described in $ARGUMENTS:

1. Read the active phase file in `docs/work/` to note current state
2. Check for uncommitted changes with `git status --short`
3. If there are uncommitted changes, stash them with a descriptive message
4. Add a note to the phase file Log about the interruption

Then investigate and fix the bug: $ARGUMENTS

After fixing, commit the fix separately without the phase task prefix, and
remind the user to run `/start-session` to resume the previous task.
```

---

#### `.opencode/commands/handoff-session.md`

```markdown
---
description: Save current progress before ending a session
---

## When to use

Use this command before ending a work session, when context is getting large, or
when the user asks to save progress for the next session.

## Steps

1. Find the active phase file in `docs/work/`
2. Update the Status section with:
   - Current task, including where work stopped
   - Last commit from `git log -1 --oneline`
   - Test results, running `task test` if not recently run
   - Any blockers or open questions
3. Check off any tasks completed this session
4. Append a dated Log entry summarizing what was accomplished and any decisions
   made
5. Update `docs/status.md`:
   - Set `Current task` to match the phase file's current task
   - Set `Last commit` from `git log -1 --oneline`
   - Set `State` in both Active Work and the Phase Summary table to match
     the phase file's current state
   - Set `Last updated` to today's date (YYYY-MM-DD)
6. Show a summary of what was saved after updating
```

---

#### `.opencode/commands/project-status.md`

```markdown
---
description: Show current progress across all work phases without modifying files
agent: plan
---

## When to use

Use this command when the user asks for project progress, phase status, or a
read-only summary of active work.

## Steps

1. Read `docs/status.md`
   - If present: use the Phase Summary table for an instant overview of all
     phases, and the Active Work block for the current task
   - If missing: run `ls docs/work/` via bash and read each file (do **not**
     use the glob tool — it does not reliably find files when given a separate
     path argument)
2. Read the active phase file for detailed task-level status
3. Summarize:
   - Which phase is currently active
   - Current task number and description
   - How many tasks are complete vs remaining
   - Any blockers listed
4. If no phase files exist yet, check `docs/plan.md` and report which phase
   should be started first
5. Format as a concise status report
6. Do not modify any files
```

---

## 9. After Initialization

Once all files are created:

1. Run `/start-session` (or the equivalent for your tool) to verify the setup
   loads correctly and reports Phase 1, Task T01
2. If the first phase file doesn't exist yet, run `/create-phase` to generate
   it from `docs/plan.md`
3. Start working — `complete-task` after each task, `handoff-session` before
   stopping

The workflow is now active. Each session starts with `start-session` and the
agent will always know exactly where to resume.
