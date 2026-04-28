# Agent-Native Workflow Hooks Plan

## Summary

MonkeyBars should use agent-native lifecycle hooks/events for workflow guidance
instead of Git hooks. `monkeybars install` will install commands, skills,
plugins, and advisory workflow hooks by default for each selected agent target.

The hooks are advisory in v1. They inject or preserve workflow context, but they
do not block prompts, block tool calls, run preflight, commit, stash, or mutate
workflow files.

## Key Changes

- Remove the existing Git hook CLI surface: `monkeybars hooks install`,
  `monkeybars hooks uninstall`, and `monkeybars hooks run`.
- Add `monkeybars install --no-agent-hooks --project <path>` for users who want
  only commands, skills, and plugins.
- Add canonical hook assets under `workflow-src/hooks/` and generate packaged
  copies under `plugins/monkeybars/hooks/`.
- Add shared workflow context logic that reads `docs/status.md`, `docs/plan.md`,
  and the active phase file when present.
- Keep hook output concise: active phase, current task, state, blockers, WIP
  files, and the next MonkeyBars command/skill guidance.

## Install Behavior

- OpenCode target installs `.opencode/plugins/monkeybars-workflow.js`.
- Claude target installs `.claude/hooks/monkeybars-workflow-context.js` and
  merges `.claude/settings.json` with `SessionStart`, `UserPromptSubmit`, and
  `Stop` hooks.
- Codex target installs `.codex/hooks/monkeybars-workflow-context.js`, merges
  `.codex/hooks.json`, and enables `[features].codex_hooks = true` in
  `.codex/config.toml`.
- Re-running install is idempotent and must not duplicate hook entries.
- Existing user config is preserved. If a config file is invalid, core assets
  still install and that target's agent hooks are skipped with a warning.

## Tests

- Default install creates agent hook assets/config for all targets.
- `--no-agent-hooks` skips hook files and hook config.
- Existing Claude, Codex, and OpenCode config is preserved and merged
  idempotently.
- Invalid existing hook config prints a warning without failing core asset
  installation.
- `monkeybars hooks install` is no longer a valid command.
- Hook context scripts emit valid JSON for Claude/Codex lifecycle events.

## Assumptions

- Claude uses project/plugin hooks for `SessionStart`, `UserPromptSubmit`, and
  `Stop`.
- Codex uses project-local `.codex/hooks.json` plus
  `[features].codex_hooks = true`.
- OpenCode v1 integration uses its plugin event surface and starts with
  compaction context preservation.
- Policy enforcement and blocking hooks are a future explicit feature, not part
  of this v1 hook implementation.
