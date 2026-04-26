# Agentic Coding Workflow

Agentic Coding Workflow is a workflow for greenfield vibe-coded projects.

It helps you start from real specs, break the work into reviewable chunks, and
move through those chunks with coding agents without letting one huge chat
become the project.

It works with Codex, Claude Code, and OpenCode.

## What It Is For

Use this when you are building a new project from documents like:

- product requirements
- architecture notes
- data models
- design notes
- API contracts
- implementation plans

The workflow turns those inputs into:

1. a project plan
2. phase files
3. small tasks
4. reviewable commits

The point is not to keep one agent conversation alive forever. The point is to
make each work chunk clear enough that a fresh context can pick it up, finish
it, and hand off cleanly.

## Before You Start

Use this inside a git repository.

Bring whatever specs you have: product notes, architecture sketches, data
models, design notes, API contracts, or rough implementation plans. They do not
need to be perfect. They just need to be good enough for an agent to turn them
into a first build plan.

Your project should also define **preflight checks**: the commands that prove a
task is safe to commit. Different stacks need different checks. Examples:

```sh
npm run lint && npm run typecheck && npm test
cargo test
go test ./...
uv run pytest
make test
just check
task test
```

Preflight can include linting, static analysis, typechecking, tests, builds,
migrations, or smoke checks. `/complete-task` runs the project’s documented
preflight checks before committing.

`Taskfile.yml` is a useful default for greenfield projects, but it is not
required. `/initialize-agent-workflow` should discover existing commands and
record them in `AGENTS.md`. If the project has no clear command surface, it can
offer to create a small `Taskfile.yml` shim.

## How It Works

Your project gets a small set of tracking files:

- `docs/plan.md` — the build plan
- `docs/work/phase-N.md` — a reviewable chunk of the plan, split into tasks
- `docs/status.md` — the current phase, task, and handoff pointer
- `AGENTS.md` — project rules every coding agent should follow

These files externalize the important context. They keep the plan, current
work, open questions, WIP files, and handoff notes outside the chat window.

That lets you use shorter, cleaner sessions:

1. Start from specs.
2. Generate or review the implementation plan.
3. Create a phase file for the next chunk.
4. Start a fresh agent context for that chunk.
5. Complete one task, or hand off unfinished work.
6. Start fresh again when the context is getting bulky.

The workflow treats context bloat as a normal failure mode. It gives you a
repeatable way to stop, write down the state, and resume in a new session.

## Basic Loop

The workflow names are the same across tools. In OpenCode they are slash
commands. In Codex and Claude Code they are skills. This README writes them as
slash commands for readability.

Install the plugin or skills once, then initialize each project:

```text
/initialize-agent-workflow
```

After that, use the workflow loop:

```text
/start-session       # read the plan and active phase
[work with the agent]
/complete-task       # run preflight, commit, and advance
/handoff-session     # save unfinished context before stopping
```

## Typical Greenfield Run

1. Put your specs in the repo, usually under `docs/prd/` or `docs/`.
2. Run `/initialize-agent-workflow`.
3. Review the generated or updated `docs/plan.md`, `docs/status.md`, and
   `docs/work/phase-1.md`.
4. Start a fresh agent context and run `/start-session`.
5. Work on the current task from the active phase file.
6. When the task is done, run `/complete-task`.
7. Follow `/context-boundary` after the commit. If the next chunk is different
   or the context is getting large, start a fresh context.
8. If you stop mid-task, run `/handoff-session` instead of relying on chat
   history.
9. When a phase is complete, run `/create-phase` to create the next reviewable
   phase file from `docs/plan.md`.

## Skills In Workflow Order

These names are slash commands in OpenCode and skills in Codex and Claude Code.
The workflow names are the same.

| Order | Skill / command | Use it when | What it does |
|---:|---|---|---|
| 1 | `/initialize-agent-workflow` | Once per project, after specs exist | Creates or updates `docs/plan.md`, `docs/status.md`, the first phase file, and agent instructions |
| 2 | `/project-status` | Anytime you want a read-only progress check | Summarizes active phase, current task, blockers, and remaining work |
| 3 | `/start-session` | At the start of each fresh context | Reads current workflow files, checks state, and reports the next task |
| 4 | `/create-phase` | When the next phase has no phase file yet | Creates the next reviewable `docs/work/phase-N.md` from `docs/plan.md` |
| 5 | `/complete-task` | After one task is implemented | Runs preflight, updates tracking files, commits once, and recommends whether to continue |
| 6 | `/context-boundary` | After a commit or when context is getting bulky | Advises whether to continue, hand off, or start a fresh context |
| 7 | `/handoff-session` | When stopping with unfinished work | Records WIP files, blockers, preflight status, decisions, and next steps |
| As needed | `/workflow-check` | When tracking state may be inconsistent | Verifies status, phase files, and repo state agree |
| As needed | `/fix-bug` | When urgent bug work interrupts phase work | Keeps bug work separate from planned phase work and preserves the handoff trail |

## Intended Fit

This is myopically built for greenfield projects where you are using agents to
vibe-code from a spec.

It is especially useful when you want:

- plan chunks checked into the repo for review
- tasks small enough to inspect and commit one at a time
- fresh contexts per chunk instead of one long overloaded session
- explicit handoffs before compaction or context loss
- the same workflow across Codex, Claude Code, and OpenCode

It can help with maintenance work too, but that is not the main design center.

## Install

Codex: install or point Codex at the plugin directory. The manifest is:

```text
plugins/agent-workflow/.codex-plugin/plugin.json
```

OpenCode: install the generated slash commands globally:

```sh
plugins/agent-workflow/scripts/install-opencode-commands.sh
```

Claude Code: install the generated skills globally:

```sh
plugins/agent-workflow/scripts/install-claude-skills.sh
```

After install, use the workflow names above in your agent tool. The plugin is
command-first. It does not install hooks in v1.

## CLI And Advisory Hooks

The skills and commands are the main workflow. The TypeScript CLI exists for
deterministic checks and optional Git hooks:

```sh
bun install
bun run build
node dist/index.js check
node dist/index.js hooks install
```

Installed hooks are project-local and advisory:

- `pre-commit` runs `agent-workflow check` and blocks only on structural
  workflow errors.
- `post-commit` reminds you to run `/context-boundary`.
- `pre-push` runs `agent-workflow check` and reminds you about documented
  preflight checks.

Hooks never update workflow files, check off tasks, commit, or stash work.

## Repository Layout

- `workflow-src/commands/` — canonical command definitions
- `workflow-src/templates/` — templates copied into initialized projects
- `cli/src/` — TypeScript CLI for checks and advisory hooks
- `plugins/agent-workflow/skills/` — generated Codex and Claude skills
- `plugins/agent-workflow/commands/` — generated OpenCode commands
- `plugins/agent-workflow/templates/` — generated project templates

Edit `workflow-src/` first. Generated plugin files should come from the
generator.

## Development

Regenerate adapters after changing command sources or templates:

```sh
bun run generate
```

Review the generated diff:

```sh
git diff -- workflow-src plugins/agent-workflow
```

Build and test the CLI:

```sh
bun run test
```
