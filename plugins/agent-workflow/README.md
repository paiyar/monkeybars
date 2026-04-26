# Agent Workflow Plugin

Spec-to-phase workflow commands for agentic coding sessions, plus an optional
CLI for deterministic checks and advisory Git hooks.

## Commands

- `/start-session`
- `/initialize-agent-workflow`
- `/project-status`
- `/create-phase`
- `/complete-task`
- `/fix-bug`
- `/handoff-session`
- `/workflow-check`
- `/context-boundary`

## Install Shape

This package is command-first. Hooks are optional, project-local, and advisory.

- Codex uses `.codex-plugin/plugin.json` and `skills/`.
- Claude Code can use the same `skills/` directories.
- OpenCode uses the generated markdown files in `commands/`.
- The CLI build output, when packaged, lives in `bin/`.

## OpenCode

Copy `commands/*.md` to either:

- project-local `.opencode/commands/`
- global `~/.config/opencode/commands/`

## Claude Code

Use the skill directories under `skills/` as plugin skills, or copy them to:

- project-local `.claude/skills/`
- global `~/.claude/skills/`

## Codex

Install this directory as a Codex plugin. The manifest is:

```text
.codex-plugin/plugin.json
```

## CLI and Hooks

The CLI is for deterministic checks outside an agent session:

```sh
agent-workflow check
agent-workflow hooks install
agent-workflow hooks uninstall
```

Installed hooks run the CLI and print guidance. They do not edit workflow
files, commit, stash, or check off tasks.

## Source of Truth

Do not edit generated files in this plugin directly. From the repository root,
edit `workflow-src/commands/` and run:

```sh
bun run generate
```
