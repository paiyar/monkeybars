# MonkeyBars (Shelved)

This project is shelved. The landscape of AI coding agent workflow tools has
matured, and several established projects solve the same problems better.

This README is a practical guide to picking one and getting started.

## The problem

As your coding agent session grows, quality degrades. Claude's own
[context-window docs](https://platform.claude.com/docs/en/build-with-claude/context-windows)
say it plainly: "more context isn't automatically better." The agent forgets
what it already did, charges ahead without thinking, and loses state between
sessions. These tools fix that.

## Pick one tool — don't combine

These tools are all batteries-included. Each one handles planning, execution,
tracking, and review. Combining two means two systems fighting over the same
workflow, thousands of tokens of competing system prompt instructions, and
duplicate tracking that drifts apart. Pick one.

- **Want zero-config?** Skills just fire automatically → [Superpowers](#superpowers)
- **Want role-based tools that do concrete things?** Browser QA, design mockups, security audits → [gstack](#gstack)
- **Want spec-driven execution with research and parallel subagents?** → [GSD](#gsd--get-shit-done)
- **Want structured task tracking without a methodology?** → [Beads](#beads)
- **Don't want any tools?** → [The simple alternative](#the-simple-alternative)

---

## Superpowers

> 174k stars — [github.com/obra/superpowers](https://github.com/obra/superpowers)

A complete development methodology that triggers automatically. You don't
learn commands — the agent brainstorms before coding, writes plans, dispatches
a fresh subagent per task, enforces TDD, and reviews its own work. You just
talk to it normally.

### Setup

Claude Code (official marketplace):

```
/plugin install superpowers@claude-plugins-official
```

Claude Code (Superpowers marketplace):

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

OpenCode — tell the agent:

```
Fetch and follow instructions from https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.opencode/INSTALL.md
```

Codex:

```
/plugins
# search for "superpowers", select Install Plugin
```

### Your first session

Just describe what you want to build. Superpowers auto-triggers:

1. **Brainstorming** — the agent asks what you're really trying to do, refines
   the idea, presents a design in digestible chunks for your approval.
2. **Planning** — breaks work into bite-sized tasks (2-5 min each) with exact
   file paths and verification steps.
3. **Subagent execution** — dispatches a fresh subagent per task with two-stage
   review (spec compliance, then code quality).
4. **TDD** — enforces RED-GREEN-REFACTOR: write failing test, minimal code to
   pass, commit.

You approve the design, say "go", and it works autonomously — often for hours.

### The loop

There isn't one to memorize. Skills fire based on context. The agent
brainstorms before code, writes plans before executing, reviews between tasks,
and finishes branches when done.

### Best for

People who don't want to think about workflow. Install it and the agent just
does the right thing.

---

## gstack

> 87k stars — [github.com/garrytan/gstack](https://github.com/garrytan/gstack)

23 role-based tools that turn Claude Code into a virtual engineering team.
Each slash command is a specialist: a CEO who challenges your product thinking,
a designer who generates mockups, a QA lead who opens a real browser and clicks
through your app, a security officer who runs OWASP audits, and a release
engineer who ships the PR.

### Setup

Open Claude Code and paste:

```
Install gstack: run git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

Claude does the rest. For other agents (Codex, OpenCode, Cursor, +7 more),
run `./setup --host <name>` after cloning.

### Your first session

```
You:    I want to build a daily briefing app for my calendar.
You:    /office-hours

Claude: [asks about the pain — specific examples, not hypotheticals]
        [challenges your framing, extracts capabilities you didn't realize]
        [generates 3 implementation approaches with effort estimates]
        RECOMMENDATION: Ship the narrowest wedge first.
        [writes design doc]

You:    /plan-ceo-review    — challenge the scope
You:    /plan-eng-review    — lock architecture, data flow, test plan
You:    Approve. Go.        — Claude implements

You:    /review             — finds bugs, auto-fixes obvious ones
You:    /qa https://staging.myapp.com  — opens real browser, tests flows
You:    /ship               — runs tests, pushes, opens PR
```

### The loop

**Think → Plan → Build → Review → Test → Ship.**

Each skill feeds into the next. `/office-hours` writes a design doc that
`/plan-ceo-review` reads. `/plan-eng-review` writes a test plan that `/qa`
picks up. `/review` catches bugs that `/ship` verifies are fixed.

### Best for

Product-minded builders who want concrete capabilities — browser QA, design
mockups, security audits, multi-model review — not just planning methodology.

---

## GSD — Get Shit Done

> 59k stars — [github.com/gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)

Spec-driven development with phase execution. You describe your idea, the
system extracts everything it needs through questions and parallel research
agents, creates atomic task plans, then executes them in parallel waves — each
plan gets a fresh 200k-token context, so quality never degrades.

### Setup

```sh
npx get-shit-done-cc@latest
```

The installer prompts for runtime (Claude Code, OpenCode, Gemini, Codex,
Cursor, +10 more) and location (global or local).

For token-conscious setups (local LLMs, pay-per-token APIs):

```sh
npx get-shit-done-cc@latest --minimal
```

This installs 6 core skills (~700 tokens overhead) instead of 86 (~12k tokens).

### Your first session

```
/gsd-new-project
```

The system asks questions until it understands your idea, spawns parallel
research agents, extracts v1/v2/out-of-scope requirements, and creates a
phased roadmap. You approve the roadmap.

Then for each phase:

```
/gsd-discuss-phase 1    — capture your preferences before planning
/gsd-plan-phase 1       — research + atomic task plans + verification
/gsd-execute-phase 1    — parallel wave execution, fresh context per plan
/gsd-verify-work 1      — walk through deliverables, auto-debug failures
```

Or just:

```
/gsd-next               — auto-detect and run the next step
```

### The loop

**discuss → plan → execute → verify**, per phase. Plans run in parallel
waves: independent plans execute concurrently, dependent plans wait. Each plan
gets a fresh context window — no accumulated garbage.

For small tasks that don't need the full loop:

```
/gsd-quick              — plan + execute with GSD guarantees, skip ceremony
/gsd-fast fix the typo  — skip planning entirely, just do it
```

### Best for

People who want the system to drive execution autonomously. Describe the idea,
approve the plan, walk away, come back to completed work with clean git
history.

---

## Beads

> 23k stars — [github.com/gastownhall/beads](https://github.com/gastownhall/beads)

A persistent, structured task tracker for coding agents. Not a methodology —
a Dolt-powered dependency-aware graph database that replaces messy markdown
plans. Tasks have IDs, priorities, dependencies, and status. The agent uses
`bd` commands to track work across sessions without losing context.

### Setup

```sh
brew install beads       # macOS / Linux
# or
npm install -g @beads/bd # Node.js

cd your-project
bd init
echo "Use 'bd' for task tracking" >> AGENTS.md
```

### Your first session

```sh
bd create "Set up auth system" -p 0          # create a P0 task
bd create "Add JWT middleware" -p 1           # create a P1 task
bd dep add <jwt-id> <auth-id>                # JWT depends on auth
bd ready                                      # show tasks with no open blockers
bd update <auth-id> --claim                   # claim and start a task
# ... do the work ...
bd close <auth-id> "Implemented"             # mark done
bd ready                                      # JWT middleware is now unblocked
```

### The loop

There isn't a prescribed loop. Beads is infrastructure, not methodology.
Your agent creates tasks, checks dependencies with `bd ready`, claims work
with `bd update --claim`, and closes tasks when done. You bring your own
workflow on top.

Hierarchical IDs support epics: `bd-a3f8` (epic) → `bd-a3f8.1` (task) →
`bd-a3f8.1.1` (subtask).

### Best for

People who want structured task tracking with a real database (not markdown
files) and want to control their own workflow. Also the right choice if you
need multi-agent coordination with dependency-aware task assignment.

---

## The simple alternative

If you don't want any tool, this works for most projects. Add these lines to
your `AGENTS.md`:

```markdown
## Workflow

- Read docs/plan.md before starting any work.
- If there's no plan, or the plan is vague, help me break my idea into
  phases with concrete tasks before writing code.
- Do one task at a time. Each task is one commit.
- Before committing, update the Current block at the top of plan.md
  and check off the completed task.
- If stopping mid-task, update the Current block with WIP files,
  what's done, what remains, and any decisions made.
- When starting a new session, read the Current block first and confirm
  the next task before changing files.
```

And use a `docs/plan.md` like this:

```markdown
# Plan

> **Current:** Phase 1, T03 — Add JWT middleware
> **Last commit:** feat: implement login endpoint
> **WIP:** src/middleware/auth.ts (half-finished), tests not started
> **Blockers:** none

## Phase 1 — Auth

- [x] T01 — Set up database schema
- [x] T02 — Implement login endpoint
- [ ] T03 — Add JWT middleware
- [ ] T04 — Write integration tests

## Phase 2 — Dashboard
...
```

This gets you 80% of the value with zero install, zero learning curve, and
zero system prompt overhead. The agent already knows how to read markdown,
check off tasks, and write status updates — it just needs to be told to.

---

## When you might want two tools

Generally don't. But two gaps are worth knowing about:

**Browser QA.** Superpowers and GSD don't open a real browser to test your app.
If you need that, your options are an MCP browser tool (lighter) or gstack's
`/qa` (heavier — installs the full gstack skill set). This is a real gap in
the Superpowers and GSD workflows.

**Long-running task tracking.** If you're on a multi-week project and your
methodology tool's tracking isn't durable enough,
[Beads](https://github.com/gastownhall/beads) can layer underneath as a
persistent task database. The [hyperpowers](https://github.com/withzombies/hyperpowers)
project (Superpowers + Beads) does this. The cost is two tracking systems
that can drift apart.

---

## What MonkeyBars was

MonkeyBars was a repo-local workflow plugin that tracked plan → phase → task
state in markdown files under `docs/agents/`. It supported OpenCode, Claude
Code, and Codex with 12 slash commands and a TypeScript CLI. The code remains
in this repo for reference.
