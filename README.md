# Agentic Coding Workflow

Agentic Coding Workflow is a workflow for greenfield vibe-coded projects.

It helps you start from real specs, break the work into reviewable chunks, and
move through those chunks with coding agents without letting one huge chat
become the project.

It works with Codex, Claude Code, and OpenCode.

## What It Is For

Use this when you are building a new project from existing documents or rough
intent like:

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
need to be complete.

Then run:

```text
/initialize-agent-workflow
```

The initializer discovers existing project docs, likely stack conventions, and
preflight commands such as tests, linting, typechecking, builds, migrations, or
smoke checks. If the project has no clear command surface, it can suggest a
small `Taskfile.yml` shim, but Taskfile is optional.

You can start with your own docs or with a rough idea. When docs already exist,
the initializer maps them into the workflow. When docs are missing or too rough,
it moves into guided planning intake to define the needed spec, architecture,
data, interface, and plan docs before implementation starts.

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
2. Brainstorm missing or rough requirements into phase-ready planning docs.
3. Generate or review the implementation plan.
4. Create a phase file for the next chunk.
5. Start a fresh agent context for that chunk.
6. Complete one task, or hand off unfinished work.
7. Start fresh again when the context is getting bulky.

The workflow treats context bloat as a normal failure mode. It gives you a
repeatable way to stop, write down the state, and resume in a new session.

## Basic Loop

The workflow names are shared across tools, but each tool exposes them
slightly differently. OpenCode uses generated slash commands. Claude Code
exposes the generated skills as slash commands. Codex packages them as plugin
skills that Codex can invoke automatically, or that you can invoke explicitly
with the skill mention UI, such as `$start-session`.

This README writes the workflow names as slash commands for readability.

Install the plugin or skills once, then initialize each project. You can start
from existing docs or from rough project intent:

```text
/initialize-agent-workflow
```

If the specs or plan are rough, refine them before phase creation:

```text
/brainstorm-plan      # turn rough intent into phase-ready docs
```

After that, use the workflow loop:

```text
/start-session       # read the plan and active phase
[work with the agent]
/complete-task       # run preflight, commit, and advance
/handoff-session     # save unfinished context before stopping
```

## Typical Greenfield Run

1. Put any existing specs in the repo, usually under `docs/prd/` or `docs/`, or
   start with a rough project idea.
2. Run `/initialize-agent-workflow`.
3. Review the generated or updated `docs/plan.md`, `docs/status.md`, and
   `docs/work/phase-1.md`.
4. If the planning docs are vague or incomplete, run `/brainstorm-plan`.
5. Start a fresh agent context and run `/start-session`.
6. Work on the current task from the active phase file.
7. When the task is done, run `/complete-task`.
8. Follow `/context-boundary` after the commit. If the next chunk is different
   or the context is getting large, start a fresh context.
9. If you stop mid-task, run `/handoff-session` instead of relying on chat
   history.
10. When a phase is complete, run `/create-phase` to create the next reviewable
   phase file from `docs/plan.md`.

## Skills In Workflow Order

The workflow names are shared across tools. OpenCode exposes them as slash
commands, Claude Code exposes the generated skills as slash commands, and
Codex exposes them as plugin skills.

| Order | Skill / command | Use it when | What it does |
|---:|---|---|---|
| 1 | `/initialize-agent-workflow` | Once per project, with existing docs or rough intent | Creates or updates planning docs, `docs/status.md`, the first phase file, and agent instructions |
| 2 | `/brainstorm-plan` | When specs or plans are rough, missing, stale, or too broad | Turns intent into phase-ready spec, architecture, and plan docs |
| 3 | `/project-status` | Anytime you want a read-only progress check | Summarizes active phase, current task, blockers, and remaining work |
| 4 | `/start-session` | At the start of each fresh context | Reads current workflow files, checks state, and reports the next task |
| 5 | `/create-phase` | When the next phase has no phase file yet | Creates the next reviewable `docs/work/phase-N.md` from `docs/plan.md` |
| 6 | `/complete-task` | After one task is implemented | Runs preflight, updates tracking files, commits once, and recommends whether to continue |
| 7 | `/context-boundary` | After a commit or when context is getting bulky | Advises whether to continue, hand off, or start a fresh context |
| 8 | `/handoff-session` | When stopping with unfinished work | Records WIP files, blockers, preflight status, decisions, and next steps |
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
deterministic checks and optional Git hooks. Bun is the only required runtime:

```sh
bun install
bun run build
bun dist/index.js check
bun dist/index.js hooks install
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
