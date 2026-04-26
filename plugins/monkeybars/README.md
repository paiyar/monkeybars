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

- Codex uses `.codex-plugin/plugin.json` and `skills/`.
- Claude Code can use the same `skills/` directories.
- OpenCode uses the generated markdown files in `commands/`.
- The CLI build output, when packaged, lives in `bin/`.

## OpenCode

OpenCode reads markdown command files from either:

- project-local `.opencode/commands/`
- global `~/.config/opencode/commands/`

Global install:

```sh
scripts/install-opencode-commands.sh
```

Per-repo install:

```sh
OPENCODE_COMMANDS_DIR=/path/to/repo/.opencode/commands \
  scripts/install-opencode-commands.sh
```

## Claude Code

Use the skill directories under `skills/` as plugin skills, or copy them to:

- project-local `.claude/skills/`
- global `~/.claude/skills/`

Global install:

```sh
scripts/install-claude-skills.sh
```

Per-repo install:

```sh
CLAUDE_SKILLS_DIR=/path/to/repo/.claude/skills \
  scripts/install-claude-skills.sh
```

## Codex

Install this directory as a Codex plugin. The manifest is:

```text
.codex-plugin/plugin.json
```

From this repository root, the same manifest is:

```text
plugins/monkeybars/.codex-plugin/plugin.json
```

If your Codex environment supports repo-local plugin marketplaces, copy both the
plugin directory and marketplace metadata into the target repo:

```sh
# From this repository root:
cp -R plugins/monkeybars /path/to/repo/plugins/
mkdir -p /path/to/repo/.agents/plugins
cp .agents/plugins/marketplace.json /path/to/repo/.agents/plugins/marketplace.json
```

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
