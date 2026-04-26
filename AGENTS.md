# Repository Guidelines

## Project Structure & Module Organization

This repository packages MonkeyBars for OpenCode, Claude Code, and Codex. The root `README.md` is the human-facing overview. Canonical workflow content lives in `workflow-src/`: `commands/` contains command definitions with YAML-style frontmatter, and `templates/` contains project initialization templates. TypeScript implementation code lives in `cli/src/`, including the CLI, advisory hook support, and adapter generator. Bun tests live in `test/`. Generated plugin artifacts live in `plugins/monkeybars/`, including `skills/`, `commands/`, `templates/`, generated CLI output in `bin/`, helper install scripts, and the Codex manifest at `.codex-plugin/plugin.json`. `.agents/plugins/marketplace.json` contains local plugin marketplace metadata.

## Build, Test, and Development Commands

- `bun run build` builds the TypeScript CLI into `dist/`.
- `bun run test` builds the CLI and runs Bun tests.
- `bun run generate` builds the CLI and regenerates tool-specific adapters from `workflow-src/` into `plugins/monkeybars/`.
- `plugins/monkeybars/scripts/install-opencode-commands.sh` installs generated OpenCode commands globally.
- `plugins/monkeybars/scripts/install-claude-skills.sh` installs generated Claude Code skills globally.
- `git diff -- workflow-src plugins/monkeybars` checks that generated files match source edits before review.

This repo uses Bun for the TypeScript CLI, generator, and tests.

## Coding Style & Naming Conventions

Use Markdown for workflow content and keep instructions direct, imperative, and tool-agnostic unless a command is explicitly platform-specific. Command source files should be lowercase kebab-case, for example `start-session.md`, and must include `name` and `description` frontmatter. TypeScript code should use standard Node/Bun APIs where practical and avoid runtime dependencies unless they clearly pay for themselves.

## Testing Guidelines

Validate changes by running `bun run test`, regenerating adapters, and reviewing the diff. For command changes, confirm both generated targets are updated: `plugins/monkeybars/skills/<command>/SKILL.md` and `plugins/monkeybars/commands/<command>.md`. For template changes, confirm copies under `plugins/monkeybars/templates/`. For CLI packaging changes, confirm `plugins/monkeybars/bin/` is updated. If adding CLI, hook, or generator behavior, add small focused Bun tests.

## Commit & Pull Request Guidelines

Recent history uses short subjects, with Conventional Commit style for features, such as `feat: Initial workflows`. Prefer `type: summary` when practical (`feat`, `fix`, `docs`, `chore`). Pull requests should describe the workflow change, list affected commands/templates, mention whether adapters were regenerated, and include relevant before/after snippets for user-facing command behavior.

## Agent-Specific Instructions

Edit canonical workflow files in `workflow-src/` first, then regenerate adapters. Edit CLI, hook, and generator behavior in `cli/src/`. Do not hand-edit generated plugin files under `plugins/monkeybars/commands/`, `skills/`, `templates/`, or `bin/` unless the generator itself is being changed.
