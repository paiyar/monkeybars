# Agent Workflow

> **Setting up this workflow in a project?** See [`agent-workflow-init.md`](agent-workflow-init.md) — a self-contained LLM initialization prompt that creates every file needed to start using this workflow.

## 1. The Problem

Coding agents lose their memory between sessions. When you close the chat,
everything the agent learned about your project — what's done, what's next,
what broke, what you decided — disappears. The next session starts from zero.

This workflow solves that by writing progress into files that live in the repo.
The next agent reads those files and picks up where the last one left off. No
chat history required.

---

## 2. The Idea

Break the project into **phases**. Break each phase into **tasks**. Track
progress in files that both humans and agents can read.

### Phases and tasks

A phase is a chunk of related work — "set up the database", "build the API",
"add the frontend". Each phase contains a list of tasks. Each task is small
enough to finish and commit in one shot.

```
Phase 2 — Financial Data Organization
  T01 — category schema and seed data
  T02 — transaction categorization queries
  T03 — account balance snapshots
  ...
```

One task = one logical change = one commit. If a task touches too many files
across unrelated parts of the codebase, split it.

### Two files track everything

Think of it like a book:

- **`docs/status.md`** is the bookmark. It tells you which chapter you're on
  and which page. An agent reads this first to orient itself instantly.
- **`docs/work/phase-N.md`** is the chapter itself. It has the full task list,
  what's done, what's blocked, and notes for the next reader.

When chat context disappears, the next agent reads the bookmark, opens the
chapter, and keeps going.

### Phase lifecycle

```
not_started → in_progress → complete
```

A phase starts as `not_started`. When the first task begins, it becomes
`in_progress`. When the last task is checked off, it becomes `complete` and the
next phase activates.

---

## 3. A Day in the Life

Here is what a typical work session looks like:

**Morning — start a session:**

You open your terminal and run `start-session`. The agent reads `status.md`,
finds you're on Phase 3, Task T04 (API route for transaction search), and
reports back. It also notices you have a stashed change from yesterday. You
tell it to pop the stash and continue.

**Working — complete a task:**

You and the agent finish T04 together. You run `complete-task`. The agent runs
the linter, type checker, and tests. Everything passes. It commits with the
message `feat(T04): transaction search API route`, checks off T04 in the phase
file, and tells you T05 is next.

You keep working and finish T05 too. You run `complete-task` again. Same
process — checks, commit, advance.

**Afternoon — an urgent bug appears:**

A user reports that login breaks with expired MFA codes. You run
`fix-bug login fails when MFA code is expired`. The agent stashes your
uncommitted T06 work, notes the interruption in the phase log, fixes the bug,
and commits it separately. It reminds you to run `start-session` to get back
to T06.

**End of day — hand off:**

You're partway through T06 but need to stop. You run `handoff-session`. The
agent writes down exactly where you stopped: which files were changed, what
tests pass, what's still open, and any decisions you made. Tomorrow — or next
week, or with a different agent tool — a fresh session runs `start-session` and
picks up right there.

---

## 4. Before You Start

Before the workflow can track progress, you need something to track. Use a reasoning model
to talk through the project while it's still vague. Produce a few durable
documents:

- Product requirements
- Architecture decisions
- Tech stack rationale
- Database or schema notes, if applicable

Put these in `docs/prd/`. Then use the coding agent in plan mode to consolidate
them into one implementation plan:

```
docs/plan.md
```

This plan is the source of truth for build order, phases, task breakdown, and
major technical decisions. Every phase file is derived from it.

---

## 5. File Structure

Add these files to the repo:

```
AGENTS.md                         # Shared instructions for coding agents
Taskfile.yml                      # Shared command surface (task test, task lint, etc.)
docs/
  plan.md                         # Master implementation plan
  status.md                       # The bookmark — active phase, current task
  prd/                            # Product, architecture, schema source docs
  work/
    phase-1.md                    # The chapter — full task list, status, log
```

Plus the command definitions for your agent tool (see
[Section 9](#9-setting-it-up)).

### What each file does

| File | Role |
|---|---|
| `AGENTS.md` | Project context, conventions, and rules for all coding agents |
| `Taskfile.yml` | Shared commands (`task test`, `task lint`, `task dev`) for humans and agents |
| `docs/plan.md` | Master build plan — phases, tasks, architecture decisions |
| `docs/status.md` | The bookmark — active phase, current task, last commit |
| `docs/work/phase-N.md` | The chapter — task checklist, status block, blockers, dated log |

### `docs/status.md` template

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

### `docs/work/phase-N.md` template

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

## Log

(Append dated entries as work progresses)
```

---

## 6. Commands

Six commands cover the full workflow:

```
start-session → [work] → complete-task → [more work?] → handoff-session
                              ↑                              |
                              └──────── next session ────────┘
```

| Command | When to use |
|---|---|
| `start-session` | Beginning of any work session |
| `project-status` | Check progress without changing files |
| `create-phase` | Create the next phase file from the plan |
| `complete-task` | Finish one task — run checks, commit, advance |
| `fix-bug <desc>` | Interrupt current work to fix an urgent bug |
| `handoff-session` | Save progress before stopping |

### Choosing between complete-task and handoff-session

Use `complete-task` when the current task is finished and should become a
commit. Use `handoff-session` when you are stopping work. If both apply:

1. `complete-task` first
2. `handoff-session` second

A task can be complete without ending the session. A session can end without the
task being complete.

---

## 7. Command Reference

Full procedures for each command follow. In a real project, each procedure lives
in a skill file or slash command definition (see [Section 9](#9-setting-it-up)).

---

### start-session

> Resume work from repo state at the beginning of a session.

**When to use:** At the start of any work session, or when the user asks to
continue work.

**Procedure:**

1. Read `docs/status.md`.
   - If present: note the phase file path, current task, and state.
   - If missing: list `docs/work/` and read each phase file to reconstruct
     state. Create `docs/status.md` from the findings before continuing.
2. Read only the single phase file pointed to by `docs/status.md`.
3. Cross-check: if the phase file's `State` differs from `docs/status.md`,
   scan `docs/work/` forward to find the real active phase and correct
   `docs/status.md`.
4. Read the Status section of the phase file to confirm the current task.
5. If there are blockers listed, surface them before proceeding.
6. Read the relevant phase section of `docs/plan.md` for detailed context.
7. Check `git status` for uncommitted changes from a previous session.
8. Report findings and wait for user confirmation before making changes.

**Output format:**

```
Phase:            [number and title]
Current task:     [T-number and description]
Last completed:   [what was done previously]
Uncommitted work: [any stashed or dirty files]
Blockers:         [none, or description]
Next steps:       [what the current task involves]
```

---

### project-status

> Read-only summary of progress across all phases.

**When to use:** When the user asks for project progress or a status check.

**Procedure:**

1. Read `docs/status.md`.
   - If present: use the Phase Summary table for an overview and the Active
     Work block for the current task.
   - If missing: list `docs/work/` and read each file.
2. Read the active phase file for detailed task-level status.
3. Summarize: active phase, current task, complete vs remaining tasks,
   blockers.
4. If no phase files exist, check `docs/plan.md` and report which phase
   should be started first.
5. **Do not modify any files.**

---

### create-phase

> Create the next phase work file from the implementation plan.

**When to use:** When starting a new phase and no `docs/work/phase-N.md` file
exists for it yet. Typically after completing the previous phase.

**Procedure:**

1. Read `docs/plan.md` to identify the next phase that needs a work file.
2. Check `docs/work/` for existing files to avoid duplicates.
3. Extract from the plan: phase number, title, goal (one sentence),
   deliverables broken into individual tasks.
4. Create `docs/work/phase-N.md` following the phase template from
   [Section 5](#5-file-structure).
5. Each task should be one logical commit. If a plan step contains multiple
   distinct changes, split it.
6. Update `docs/status.md`:
   - Append a new row to the Phase Summary table (`not_started`).
   - Update Active Work to point to the new phase file.
   - Set `Last updated` to today's date.
7. Show the created phase file to the user for review before proceeding.

**Task sizing guidelines:**

- One task = one commit.
- Split if >5 files across different domains.
- Schema + queries + routes for the same domain can be one task.
- Tests can be bundled with code or kept as a separate task.
- Scaffolding and config changes should be their own task.

---

### complete-task

> Run checks, commit, update progress, advance to the next task.

**When to use:** After finishing implementation of a task from the phase file.

**Procedure:**

1. Run `task lint` — fix any issues before proceeding.
2. Run `task typecheck` — fix any issues before proceeding.
3. Run `task test` — fix any issues before proceeding.
4. Review changes with `git status --short`.
5. Stage only files related to the completed task.
6. Commit with message format: `type(TXX): description`
7. Update the active `docs/work/phase-N.md`:
   - Check off the completed task checkbox.
   - Update Status: current task to next task.
   - Update Status: last commit hash and message.
   - Update Status: test counts.
   - Append to Log with what was done.
8. Update `docs/status.md`:
   - Set `Current task` to the next unchecked task (or `complete` if none
     remain).
   - Set `Last commit` to the new commit hash + message.
   - Set `Last updated` to today's date.
   - If the phase is fully complete: update its row to `complete`, find the
     next `not_started` phase, and update Active Work to point there.
9. Report the next task and ask if the user wants to continue.

**Commit message examples:**

```
feat(T01): root scaffolding with flake.nix and taskfile
feat(T03): drizzle schema for identity and account tables
fix(T03): correct foreign key on account_balance_snapshot
test(T05): query function tests for accounts and transactions
chore(T01): update biome config for import sorting
```

---

### fix-bug

> Interrupt current work cleanly to fix an urgent bug.

**When to use:** When the user reports a bug that should be fixed separately
from current phase work.

**Procedure:**

1. Read the active phase file to note current state.
2. Check for uncommitted changes with `git status --short`.
3. If there are uncommitted changes, stash them with a descriptive message.
4. Add a note to the phase file Log about the interruption.
5. Investigate and fix the bug.
6. Commit the fix separately — do not use the phase task prefix.
7. Remind the user to run `start-session` to resume the previous task.

---

### handoff-session

> Save current progress before ending a session.

**When to use:** Before ending a work session, when context is getting large,
or when the user asks to save progress for next time.

**Procedure:**

1. Find the active phase file in `docs/work/`.
2. Update the Status section:
   - Current task, including where work stopped.
   - Last commit from `git log -1 --oneline`.
   - Test results — run `task test` if not recently run.
   - Any blockers or open questions.
3. Check off any tasks completed this session.
4. Append a dated Log entry summarizing what was accomplished and any
   decisions made.
5. Update `docs/status.md`:
   - Set `Current task` to match the phase file.
   - Set `Last commit` from `git log -1 --oneline`.
   - Set `State` in both Active Work and Phase Summary to match the phase
     file.
   - Set `Last updated` to today's date.
6. Show a summary of what was saved.

---

## 8. Edge Cases

Not every issue needs the full `fix-bug` workflow:

| Scope | Action |
|---|---|
| **Trivial** (typo, one-liner) | Fix inline, commit, continue current task |
| **Bug fix** | Use `fix-bug` — stash WIP, fix separately, resume |
| **Scope change** | Update the phase file, discuss with user before switching |

---

## 9. Setting It Up

This workflow is tool-agnostic. The commands need to be stored where your agent
tool expects them:

| Tool | Location | Format |
|---|---|---|
| OpenCode | `.opencode/commands/<name>.md` | Markdown slash commands |
| Claude Code | `.claude/skills/<name>/SKILL.md` | Skill files with YAML front matter |

Claude Code also reads `CLAUDE.md` at the repo root, which can reference
`AGENTS.md` for shared project instructions.

Both tools use the same command names and procedures. If you change a workflow,
update both copies. For a more maintainable setup, keep one canonical source
(like this document) and generate the tool-specific files from it.

### Skill file format (Claude Code)

Each skill file has YAML front matter and the procedure as markdown:

```markdown
---
name: start-session
description: Protocol for starting an implementation session
---

## When to use

[trigger description]

## Steps

1. [step]
2. [step]
```

### Slash command format (OpenCode)

OpenCode commands are plain markdown files named after the command:

```
.opencode/commands/start-session.md
```

The content follows the same structure as the skill procedures above.
