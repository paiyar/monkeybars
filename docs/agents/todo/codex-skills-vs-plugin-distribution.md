# Codex Skills Vs Plugin Distribution

Slug: make Codex project installs use `.agents/skills`; keep `.codex-plugin` only for plugin distribution.

## Context

MonkeyBars currently works as expected in Claude Code and OpenCode because the
installer writes to each tool's direct discovery surface:

- Claude Code: `.claude/skills/`
- OpenCode: `.opencode/commands/`

The Codex install path is different today. It copies the MonkeyBars plugin
payload to `.codex/plugins/monkeybars/` and writes
`.agents/plugins/marketplace.json`. Those files make MonkeyBars available as a
local plugin marketplace entry, but they do not make the bundled skills appear
as repo-local `$skill` autocomplete in Codex.

Codex does not scan `.codex/plugins/<plugin>/skills` as direct project skills
just because the files exist. Plugin skills become active after the plugin is
installed/enabled through Codex's plugin flow, typically `/plugins`. Direct
repo-local Codex skills are discovered from `.agents/skills/`.

## Observed Root Cause

- The generated skills exist under `monkeybars/skills/`.
- The project-local dogfood install copied them under
  `.codex/plugins/monkeybars/skills/`.
- The project marketplace exists at `.agents/plugins/marketplace.json`.
- The marketplace policy marks MonkeyBars as available, not installed.
- The user's `~/.codex/config.toml` has no enabled MonkeyBars plugin entry.
- There is no project `.agents/skills/` directory for Codex to scan directly.

That explains why Claude Code and OpenCode show commands or skills, while Codex
does not show MonkeyBars skill autocomplete.

## Comparison With Established Codex Plugins

Known Codex plugin bundles such as Superpowers, Build Web Apps, GitHub, and
Plugin Eval use the same package shape:

- `.codex-plugin/plugin.json`
- `"skills": "./skills/"`
- `skills/<name>/SKILL.md`
- optional `skills/<name>/agents/openai.yaml`

Those plugins rely on Codex plugin installation and enablement. They do not
depend on a repository-local `.codex/plugins/<plugin>/skills` directory being
scanned as project skills.

Superpowers is the closest comparison because it is also a workflow and
methodology plugin. Its Codex distribution model is plugin-first: install or
enable the plugin, then invoke bundled skills through Codex's plugin or skill
UI. That is distinct from a project-local workflow installer whose purpose is
to immediately add repo-specific commands and skills.

## Recommended Long-Term Fix

Treat Codex as two separate surfaces.

### 1. Default Codex Project Install

`monkeybars install codex --project <repo>` should install direct repo-local
Codex skills into:

```text
.agents/skills/start-session/SKILL.md
.agents/skills/complete-task/SKILL.md
.agents/skills/context-boundary/SKILL.md
...
```

This gives Codex immediate `$start-session` style autocomplete and aligns the
installer with the way Claude Code and OpenCode already behave: write to the
agent's direct project-local discovery path.

### 2. Codex Plugin Distribution

Keep `monkeybars/.codex-plugin/plugin.json` and `monkeybars/skills/` as the
plugin package for Codex marketplace or plugin distribution.

Do not imply that copying this plugin bundle into `.codex/plugins/monkeybars`
activates the bundled skills. If MonkeyBars keeps a plugin-install workflow,
make it explicit, for example:

```sh
monkeybars install codex-plugin --project <repo>
```

That command should document or perform the Codex plugin install/enable step,
not merely copy plugin source files.

### 3. Documentation Wording

Avoid saying Codex has MonkeyBars slash commands. Codex slash commands are
Codex CLI controls such as `/plugins`, `/skills`, `/status`, and `/review`, not
arbitrary workflow commands.

Document invocation as:

- OpenCode: `/start-session`
- Claude Code: `/start-session` or the Claude skill UI, depending current
  Claude behavior
- Codex direct project install: `$start-session`
- Codex plugin install: use Codex plugin or skill invocation after installing
  MonkeyBars through `/plugins`

## Implementation Notes

- Add a Codex direct-skill install target that copies generated skills into
  `.agents/skills/`.
- Preserve unrelated user skills in `.agents/skills/`, matching the existing
  selective replacement behavior for Claude and OpenCode.
- Consider generating Codex-specific skill metadata separately from Claude
  skill metadata so Codex outputs do not carry Claude-only frontmatter such as
  `disable-model-invocation`.
- Add optional `agents/openai.yaml` per skill for Codex display names,
  descriptions, icons, or default prompts if useful.
- Add installer tests for `.agents/skills/<name>/SKILL.md`.
- Add a `doctor` or `install --verify` check that reports whether Codex has
  direct `.agents/skills` installed, only a marketplace entry, or an enabled
  plugin.

## Acceptance Criteria

- After `monkeybars install codex --project <repo>`, a fresh Codex session in
  that repo exposes MonkeyBars skills through `$start-session` autocomplete.
- The installer no longer presents `.codex/plugins/monkeybars/skills` as enough
  for direct skill discovery.
- Plugin packaging still validates as a Codex plugin bundle for users who want
  marketplace/plugin distribution.
- README and generated plugin docs clearly distinguish direct Codex repo skills
  from installed Codex plugins.
