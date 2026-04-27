# MonkeyBars Plugin

Repo-local workflow commands for greenfield builds, brownfield rescue, and
post-v1 agentic coding sessions, plus an optional CLI for deterministic checks
and advisory agent-native workflow hooks.

## Commands

- `/start-session`
- `/initialize-monkeybars`
- `/map-codebase`
- `/brainstorm-plan`
- `/project-status`
- `/create-phase`
- `/complete-task`
- `/fix-bug`
- `/handoff-session`
- `/workflow-check`
- `/context-boundary`

## Install Shape

This package is command-first. Agent-native workflow hooks are project-local,
advisory, and installed by default.
Run the installer from git with `npx`:

```sh
npx --package github:paiyar/monkeybars#main -- monkeybars install --project /path/to/repo
```

Or install the CLI globally from git:

```sh
npm install -g github:paiyar/monkeybars#main
monkeybars install --project /path/to/repo
```

To consume a specific repo revision directly, pin an immutable GitHub tag or
commit:

```sh
npx --package github:paiyar/monkeybars#<tag-or-commit> -- monkeybars install --project /path/to/repo
npm install -g github:paiyar/monkeybars#<tag-or-commit>
monkeybars install --project /path/to/repo
```

The `main` ref is a floating branch. Each install resolves the current tip of
`main`; use an exact release tag or commit SHA when you need a repeatable
install.

Git installs run the repository `prepare` build, so Bun must be on `PATH`
during installation. The installed CLI runs on Node.js 20 or newer. Bun is also
used for development, tests, and generating packaged adapter artifacts from a
checkout.

Omitting targets installs all supported agents: OpenCode, Claude Code, and
Codex. Pass one or more targets only when you want a subset, or
`--no-agent-hooks` when you want assets without lifecycle hooks:

```sh
monkeybars install --project /path/to/repo
monkeybars install opencode claude --project /path/to/repo
monkeybars install --no-agent-hooks --project /path/to/repo
```

The generated assets land in the tool-specific project-local directories:

- OpenCode: `.opencode/commands/` plus `.opencode/plugins/`
- Claude Code: `.claude/skills/`, `.claude/hooks/`, and `.claude/settings.json`
- Codex: `.codex/plugins/monkeybars/`, `.agents/plugins/marketplace.json`, and `.codex/hooks.json`

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
monkeybars/.codex-plugin/plugin.json
```

After CLI install, the target repo manifest is:

```text
.codex/plugins/monkeybars/.codex-plugin/plugin.json
```

The CLI copies the plugin payload and marketplace metadata into the target
repo. The marketplace file stays at `.agents/plugins/marketplace.json` and
points to `./.codex/plugins/monkeybars`.

Use `monkeybars install codex --project /path/to/repo` if you only want the
Codex plugin bundle.

Invoke skills explicitly with the skill mention UI, such as
`$initialize-monkeybars` and `$start-session`.

## CLI and Hooks

The CLI is for deterministic checks and state updates outside an agent session:

```sh
monkeybars status
monkeybars next
monkeybars check
monkeybars health
monkeybars preflight --dry-run
monkeybars advance --task T01 --commit "feat(T01): finish task"
monkeybars migrate-status
monkeybars doctor
```

Installed agent-native hooks inject or preserve MonkeyBars workflow context.
They do not edit workflow files, block tool calls, commit, stash, or check off
tasks.

## Source of Truth

Do not edit generated files in this plugin directly. From the repository root,
edit `workflow-src/commands/` and run:

```sh
bun run generate
```
