# MonkeyBars Plugin

Repo-local workflow commands for greenfield builds, brownfield rescue, and
post-v1 agentic coding sessions, plus an optional CLI for deterministic checks
and advisory Git hooks.

## Commands

- `/start-session`
- `/initialize-monkeybars`
- `/brainstorm-plan`
- `/project-status`
- `/create-phase`
- `/complete-task`
- `/fix-bug`
- `/handoff-session`
- `/workflow-check`
- `/context-boundary`

## Install Shape

This package is command-first. Hooks are optional, project-local, and advisory.
The supported install flow is the package CLI:

```sh
monkeybars install --project /path/to/repo
monkeybars install opencode codex --project /path/to/repo
```

Omitting targets installs all supported agents: OpenCode, Claude Code, and
Codex. Pass one or more targets only when you want a subset.

The generated assets land in the tool-specific project-local directories:

- OpenCode: `.opencode/commands/`
- Claude Code: `.claude/skills/`
- Codex: `plugins/monkeybars/` plus `.agents/plugins/marketplace.json`

The shell scripts in `scripts/` remain for checkout-based compatibility, but
the CLI is the primary install path.

## OpenCode

OpenCode reads markdown command files from either:

- project-local `.opencode/commands/`
- global `~/.config/opencode/commands/`

## Claude Code

Claude Code uses the skill directories under `skills/`, which the CLI installs
into project-local `.claude/skills/`.

## Codex

Install this directory as a Codex plugin. The manifest is:

```text
.codex-plugin/plugin.json
```

From this repository root, the same manifest is:

```text
plugins/monkeybars/.codex-plugin/plugin.json
```

The CLI copies both the plugin directory and marketplace metadata into the
target repo.

Use `monkeybars install codex --project /path/to/repo` if you only want the
Codex plugin bundle.

Invoke skills explicitly with the skill mention UI, such as
`$initialize-monkeybars` and `$start-session`.

## CLI and Hooks

The CLI is for deterministic checks outside an agent session:

```sh
monkeybars check
monkeybars hooks install
monkeybars hooks uninstall
```

Installed hooks run the CLI and print guidance. They do not edit workflow
files, commit, stash, or check off tasks.

## Source of Truth

Do not edit generated files in this plugin directly. From the repository root,
edit `workflow-src/commands/` and run:

```sh
bun run generate
```
