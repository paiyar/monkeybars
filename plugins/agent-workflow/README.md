# Agent Workflow Plugin

Repo-backed workflow commands for agentic coding sessions.

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

This package is command-first and does not install hooks in v1.

- Codex uses `.codex-plugin/plugin.json` and `skills/`.
- Claude Code can use the same `skills/` directories.
- OpenCode uses the generated markdown files in `commands/`.

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

## Source of Truth

Do not edit generated files in this plugin directly. Edit
`../../workflow-src/commands/` and run:

```sh
python3 ../../scripts/generate_adapters.py
```
