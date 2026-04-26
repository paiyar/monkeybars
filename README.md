# Agentic Coding Workflow

Coding agents forget what happened when the chat ends. This project fixes that
by making the repo remember.

It gives Codex, Claude Code, and OpenCode the same workflow: write project
progress into plain Markdown files, then read those files at the start of the
next session.

## The Idea

Your project gets a small set of tracking files:

- `docs/plan.md` — the build plan
- `docs/status.md` — the current phase, task, and last known state
- `docs/work/phase-N.md` — the task list, notes, blockers, and handoff log
- `AGENTS.md` — project rules every coding agent should follow

Think of `docs/status.md` as the bookmark and `docs/work/phase-N.md` as the
current chapter. A fresh agent reads both and knows where to continue.

## Daily Use

Install the plugin once, then initialize each project:

```text
/initialize-agent-workflow
```

After that, use the workflow loop:

```text
/start-session       # read repo memory and resume
[work with the agent]
/complete-task       # run checks, commit, and advance
/handoff-session     # save unfinished context before stopping
```

Useful supporting commands:

- `/project-status` — show progress without changing files
- `/create-phase` — create the next phase file from `docs/plan.md`
- `/fix-bug` — interrupt current work for a separate bug fix
- `/workflow-check` — verify tracking files agree with repo state
- `/context-boundary` — decide whether to continue or start fresh

## Install

Codex uses the plugin manifest:

```text
plugins/agent-workflow/.codex-plugin/plugin.json
```

OpenCode global commands:

```sh
plugins/agent-workflow/scripts/install-opencode-commands.sh
```

Claude Code global skills:

```sh
plugins/agent-workflow/scripts/install-claude-skills.sh
```

The plugin is command-first. It does not install hooks in v1.

## Repository Layout

- `workflow-src/commands/` — canonical command definitions
- `workflow-src/templates/` — templates copied into initialized projects
- `plugins/agent-workflow/skills/` — generated Codex and Claude skills
- `plugins/agent-workflow/commands/` — generated OpenCode commands
- `plugins/agent-workflow/templates/` — generated project templates

Edit `workflow-src/` first. Generated plugin files should come from the
generator.

## Development

Regenerate adapters after changing command sources or templates:

```sh
python3 scripts/generate_adapters.py
```

Review the generated diff:

```sh
git diff -- workflow-src plugins/agent-workflow
```
