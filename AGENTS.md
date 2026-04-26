# Repository Guidelines

## Project Structure & Module Organization

This repository packages an agentic coding workflow for OpenCode, Claude Code, and Codex. The root `README.md` is the human-facing overview. Canonical editable sources live in `workflow-src/`: `commands/` contains command definitions with YAML-style frontmatter, and `templates/` contains project initialization templates. Generated plugin artifacts live in `plugins/agent-workflow/`, including `skills/`, `commands/`, `templates/`, helper install scripts, and the Codex manifest at `.codex-plugin/plugin.json`. `.agents/plugins/marketplace.json` contains local plugin marketplace metadata.

## Build, Test, and Development Commands

- `python3 scripts/generate_adapters.py` regenerates tool-specific adapters from `workflow-src/` into `plugins/agent-workflow/`.
- `plugins/agent-workflow/scripts/install-opencode-commands.sh` installs generated OpenCode commands globally.
- `plugins/agent-workflow/scripts/install-claude-skills.sh` installs generated Claude Code skills globally.
- `git diff -- workflow-src plugins/agent-workflow` checks that generated files match source edits before review.

There is no package manager, compiled build, or formal test runner in this repo.

## Coding Style & Naming Conventions

Use Markdown for workflow content and keep instructions direct, imperative, and tool-agnostic unless a command is explicitly platform-specific. Command source files should be lowercase kebab-case, for example `start-session.md`, and must include `name` and `description` frontmatter. Python scripts use standard library-only code, 4-space indentation, type hints where helpful, and `pathlib` for filesystem work.

## Testing Guidelines

Validate changes by regenerating adapters and reviewing the diff. For command changes, confirm both generated targets are updated: `plugins/agent-workflow/skills/<command>/SKILL.md` and `plugins/agent-workflow/commands/<command>.md`. For template changes, confirm copies under `plugins/agent-workflow/templates/`. If adding behavior to `scripts/generate_adapters.py`, prefer small focused tests or at least exercise failure paths manually with representative frontmatter.

## Commit & Pull Request Guidelines

Recent history uses short subjects, with Conventional Commit style for features, such as `feat: Initial workflows`. Prefer `type: summary` when practical (`feat`, `fix`, `docs`, `chore`). Pull requests should describe the workflow change, list affected commands/templates, mention whether adapters were regenerated, and include relevant before/after snippets for user-facing command behavior.

## Agent-Specific Instructions

Edit canonical files in `workflow-src/` first, then regenerate adapters. Do not hand-edit generated plugin command or skill files unless the generator itself is being changed.
