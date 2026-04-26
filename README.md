# MonkeyBars

Guardrails for vibe monkeys.

Monkey thinks up spec. Monkey chunks up spec. Monkey makes iterative progress.

MonkeyBars is a repo-local workflow for agent-built projects:
greenfield builds, brownfield rescue, and v2/v3 iteration. It helps coding
agents turn rough ideas, specs, and half-built code into plans, phases, small
tasks, and reviewable commits.

It is also a defense against context rot. Claude's
[context-window docs](https://platform.claude.com/docs/en/build-with-claude/context-windows)
put the problem plainly: "more context isn't automatically better. As token
count grows, accuracy and recall degrade." MonkeyBars keeps the important state
in the repo instead of trapping it in one fat chat that eventually needs
compaction.

The goal is not to keep one giant agent conversation alive forever. The goal is
to make each work chunk clear enough that a fresh context can pick it up, finish
it, and hand off cleanly.

It works with Codex, Claude Code, and OpenCode.

## What It Is For

Use this when you are building a new project, adopting an existing repo, or
planning the next release from inputs like:

- product requirements
- architecture notes
- data models
- design notes
- API contracts
- implementation plans
- partially implemented or vibe-coded code
- issue lists, bug reports, or refactor notes

The workflow turns those inputs into:

1. a project plan
2. phase files
3. small tasks
4. reviewable commits

## Before You Start

Use this inside a git repository.

Bring whatever context you have: product notes, architecture sketches, data
models, design notes, API contracts, rough implementation plans, existing code,
or notes about what feels broken. It does not need to be complete.

Then run:

```text
/initialize-monkeybars
```

The initializer discovers existing project docs, likely stack conventions, and
preflight commands such as tests, linting, typechecking, builds, migrations, or
smoke checks. If the project has no clear command surface, it can suggest a
small `Taskfile.yml` shim, but Taskfile is optional.

You can start with your own docs, a rough idea, or a messy existing repo. When
docs already exist, the initializer maps them into the workflow. When docs are
missing, stale, contradictory, or too rough, it moves into guided planning
intake to define the needed spec, architecture, data, interface, and active
plan docs before implementation starts.

## How It Works

Your project gets a small set of planning and tracking files:

- `docs/prd/*.md` — living product, architecture, data, and interface truth
- `docs/plan.md` — the active implementation plan for the current work slice
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

`docs/plan.md` is intentionally the active plan, not a permanent backlog. When a
release or work slice is complete, archive the completed plan under
`docs/archive/plans/YYYY-MM-DD-<scope>.md`, then write a fresh active
`docs/plan.md` for the next release. Keep old `docs/work/phase-N.md` files as
execution history, and keep phase numbers increasing instead of reusing Phase 1.

## Basic Loop

The workflow names are shared across tools, but each tool exposes them
slightly differently. OpenCode uses generated slash commands. Claude Code
exposes the generated skills as slash commands. Codex packages them as plugin
skills that you invoke explicitly with the skill mention UI, such as
`$start-session`.

This README writes the workflow names as slash commands for readability.

Install the plugin or skills once, then initialize each project. You can start
from existing docs, existing code, or rough project intent:

```text
/initialize-monkeybars
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

## Common Runs

### Greenfield

1. Put any existing specs in the repo, usually under `docs/prd/` or `docs/`, or
   start with a rough project idea.
2. Run `/initialize-monkeybars`.
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

### Brownfield Rescue

Use this when an existing repo has useful code but poor planning context, one
oversized chat history, unreliable tests, or unclear architecture.

1. Run `/initialize-monkeybars` in the repo.
2. Let the initializer inspect the current docs, code structure, dependency
   manifests, and available preflight commands.
3. Capture current behavior honestly in `docs/prd/` before inventing a target
   architecture.
4. Use `/brainstorm-plan` to define the first active plan. The first phase is
   often inventory, stabilization, test coverage, or preflight setup before
   larger feature work.
5. Create phase files from the active plan and proceed one reviewable task and
   commit at a time.

### Post-v1 Or Next Release

Use this when the current active plan is complete and you need v2, v3, or a new
work slice.

1. Confirm the current phase and plan are complete with `/project-status` and
   `/workflow-check`.
2. Archive the completed `docs/plan.md` to
   `docs/archive/plans/YYYY-MM-DD-<scope>.md`.
3. Update the living docs under `docs/prd/` to reflect what is true after the
   completed release.
4. Run `/brainstorm-plan` to define the next active plan in `docs/plan.md`.
5. Run `/create-phase`. Use the next available `docs/work/phase-N.md` number
   instead of resetting to Phase 1.

## Skills In Workflow Order

The workflow names are shared across tools. OpenCode exposes them as slash
commands, Claude Code exposes the generated skills as slash commands, and
Codex exposes them as plugin skills.

| Order | Skill / command | Use it when | What it does |
|---:|---|---|---|
| 1 | `/initialize-monkeybars` | Once per project, with existing docs, existing code, or rough intent | Creates or updates planning docs, `docs/status.md`, the first phase file, and agent instructions |
| 2 | `/brainstorm-plan` | When specs or plans are rough, missing, stale, complete, or too broad | Turns intent, repo state, or next-release goals into phase-ready docs |
| 3 | `/project-status` | Anytime you want a read-only progress check | Summarizes active phase, current task, blockers, and remaining work |
| 4 | `/start-session` | At the start of each fresh context | Reads current workflow files, checks state, and reports the next task |
| 5 | `/create-phase` | When the next phase has no phase file yet | Creates the next reviewable `docs/work/phase-N.md` from `docs/plan.md` |
| 6 | `/complete-task` | After one task is implemented | Runs preflight, updates tracking files, commits once, and recommends whether to continue |
| 7 | `/context-boundary` | After a commit or when context is getting bulky | Advises whether to continue, hand off, or start a fresh context |
| 8 | `/handoff-session` | When stopping with unfinished work | Records WIP files, blockers, preflight status, decisions, and next steps |
| As needed | `/workflow-check` | When tracking state may be inconsistent | Verifies status, phase files, and repo state agree |
| As needed | `/fix-bug` | When urgent bug work interrupts phase work | Keeps bug work separate from planned phase work and preserves the handoff trail |

## Intended Fit

This is built for projects where agents need repo-tracked context, small
reviewable changes, and safe handoffs between fresh sessions.

It is especially useful when you want:

- plan chunks checked into the repo for review
- tasks small enough to inspect and commit one at a time
- fresh contexts per chunk instead of one long overloaded session
- explicit handoffs before compaction or context loss
- the same workflow across Codex, Claude Code, and OpenCode

It is a poor fit for one-off edits where the cost of planning is higher than
the code change, or for teams that already have a stronger external planning
system and only need agents to execute tickets.

## Install

Install with the package-style CLI:

```sh
monkeybars install --project /path/to/repo
monkeybars install opencode codex --project /path/to/repo
```

Omitting targets installs all supported agents: OpenCode, Claude Code, and
Codex. Pass one or more targets only when you want a subset.

That is the supported install surface. The checkout in this repository is just
the current development transport until a published package is available.
From this repository root, use:

```sh
bun dist/index.js install --project /path/to/repo
```

The legacy shell scripts under `plugins/monkeybars/scripts/` remain available
for direct checkout use, but they are no longer the primary install path.

### OpenCode

OpenCode reads markdown command files from global
`~/.config/opencode/commands/` or project-local `.opencode/commands/`.

The CLI installs the generated commands into the project-local directory:

```sh
monkeybars install --project /path/to/repo
```

Use `monkeybars install opencode --project /path/to/repo` if you only want the
OpenCode commands.

After install, run commands such as `/initialize-monkeybars` and
`/start-session`.

### Claude Code

Claude Code reads skills from global `~/.claude/skills/` or project-local
`.claude/skills/`.

The CLI installs the generated skills into the project-local directory:

```sh
monkeybars install --project /path/to/repo
```

Use `monkeybars install claude --project /path/to/repo` if you only want the
Claude skills.

After install, invoke skills as slash commands such as
`/initialize-monkeybars` and `/start-session`.

### Codex

Install or point Codex at the plugin directory. The manifest is:

```text
plugins/monkeybars/.codex-plugin/plugin.json
```

The CLI copies both the plugin directory and `.agents/plugins/marketplace.json`
into the target repo:

```sh
monkeybars install codex --project /path/to/repo
```

Use `monkeybars install codex --project /path/to/repo` if you only want the
Codex plugin bundle.

After install, invoke skills explicitly with the skill mention UI, such as
`$initialize-monkeybars` and `$start-session`.

The plugin is command-first. It does not install hooks in v1.

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

- `pre-commit` runs `monkeybars check` and blocks only on structural
  workflow errors.
- `post-commit` reminds you to run `/context-boundary`.
- `pre-push` runs `monkeybars check` and reminds you about documented
  preflight checks.

Hooks never update workflow files, check off tasks, commit, or stash work.

## Repository Layout

- `workflow-src/commands/` — canonical command definitions
- `workflow-src/templates/` — templates copied into initialized projects
- `cli/src/` — TypeScript CLI for checks and advisory hooks
- `plugins/monkeybars/skills/` — generated Codex and Claude skills
- `plugins/monkeybars/commands/` — generated OpenCode commands
- `plugins/monkeybars/templates/` — generated project templates

Edit `workflow-src/` first. Generated plugin files should come from the
generator.

## Development

Regenerate adapters after changing command sources or templates:

```sh
bun run generate
```

Review the generated diff:

```sh
git diff -- workflow-src plugins/monkeybars
```

Build and test the CLI:

```sh
bun run test
```
