# Repository Guidelines

## Project Structure & Module Organization

This repository packages MonkeyBars for OpenCode, Claude Code, and Codex. The root `README.md` is the human-facing overview. Canonical workflow content lives in `workflow-src/`: `commands/` contains command definitions with YAML-style frontmatter, `templates/` contains project initialization templates, and `hooks/{shared,opencode}/` contains agent-native hook scripts. TypeScript implementation code lives in `cli/src/`, including the CLI, advisory hook support, and adapter generator. Bun tests live in `test/`. Generated plugin artifacts live in the eponymous `monkeybars/` directory at the repo root, including `skills/`, `commands/`, `templates/`, `hooks/`, generated CLI output in `bin/`, helper install scripts, and the Codex manifest at `.codex-plugin/plugin.json`. `.agents/plugins/marketplace.json` contains local plugin marketplace metadata.

## Build, Test, and Development Commands

- `bun run build` builds the TypeScript CLI into `dist/`.
- `bun run test` builds the CLI and runs Bun tests.
- `bun test test/<file>.test.ts` runs a single test file. `bun test -t "<name>"` filters by test name.
- `bun run generate` builds the CLI and regenerates tool-specific adapters from `workflow-src/` into `monkeybars/`.
- `bun dist/index.js install --project /path/to/repo` is a local smoke test of the installer after `bun run build`.
- `bun dist/index.js install --project .` dogfoods MonkeyBars on this repo itself; install is purely additive, only writing under `.opencode/`, `.claude/`, `.codex/`, and `.agents/plugins/marketplace.json` (all gitignored).
- `bun dist/index.js check` runs the deterministic workflow-status check against the current project's `docs/agents/status.md` and active phase file.
- `monkeybars/scripts/install-opencode-commands.sh` installs generated OpenCode commands globally.
- `monkeybars/scripts/install-claude-skills.sh` installs generated Claude Code skills globally.
- `git diff -- workflow-src monkeybars` checks that generated files match source edits before review.

This repo uses Bun for the TypeScript CLI, generator, and tests. `npm` publishing and GitHub installs run `bun run generate` via `prepare`, so GitHub installs require Bun on `PATH`.

## Architecture

MonkeyBars packages one set of workflow commands for three coding-agent targets (OpenCode, Claude Code, Codex). The code is organized around a single-source-of-truth generator: canonical workflow content lives in `workflow-src/`, and per-tool artifacts in `monkeybars/` are produced from it. The `monkeybars/` directory uses the eponymous-folder pattern (the source folder shares the package name) so installs into a consumer project never collide with the package's own source paths.

### Source → generator → adapter pipeline

- `workflow-src/commands/*.md` — canonical command definitions. Markdown with YAML-style frontmatter requiring `name` and `description`. Optional keys: `include_templates` (comma-separated template names appended to the body under an "Included Templates" section), `opencode_agent` (propagated to OpenCode frontmatter).
- `workflow-src/templates/*.md` — project templates that end up both (a) copied verbatim to `monkeybars/templates/` and (b) inlined into skill bodies when a command lists them via `include_templates`.
- `workflow-src/hooks/{shared,opencode}/` — canonical agent-native hook scripts, copied verbatim to `monkeybars/hooks/`.
- `cli/src/generator.ts` (`generateAdapters`) — parses each command, then emits one Claude/Codex skill (`monkeybars/skills/<name>/SKILL.md` with `disable-model-invocation: true`) and one OpenCode command (`monkeybars/commands/<name>.md`). It also resets and refills `templates/`, `hooks/`, and `bin/` under the plugin directory. The CLI bin copy comes from `dist/`, so the generator implicitly depends on a prior build.

### CLI surface (`cli/src/`)

`index.ts` wires Commander with two subcommands, both strict about unknown args/options:

- `check` (`check.ts`) — read-only, cross-validates `docs/agents/status.md` against the active `docs/agents/work/phase-N.md`: matching phase label/state/current task, first-unchecked-task invariant, last-commit recency via `git log`, and WIP documentation vs. `git status --porcelain`. Returns a `CheckResult` with severity-tagged findings; errors flip `ok` to false (exit 1).
- `install` (`install.ts`) — copies generated assets into a target project. Targets are `opencode`, `claude`, and `codex`; omitting the `[targets...]` argument installs all three. Layout per target:
  - OpenCode: `.opencode/commands/` (replaces directory) and, when agent hooks are enabled, `.opencode/plugins/monkeybars-workflow.js`.
  - Claude: `.claude/skills/` (replaces directory) and, when agent hooks are enabled, `.claude/hooks/monkeybars-workflow-context.js` plus idempotent merges into `.claude/settings.json` (`SessionStart`, `UserPromptSubmit`, `Stop`).
  - Codex: `.codex/plugins/monkeybars/` (full plugin copy) and `.agents/plugins/marketplace.json`; agent hooks additionally copy `.codex/hooks/monkeybars-workflow-context.js`, merge `.codex/hooks.json`, and ensure `[features].codex_hooks = true` in `.codex/config.toml`.
  - `--no-agent-hooks` skips only the hook installation for every selected target.

Install is purely additive: it only writes under the agent footprint listed above. It never modifies or deletes files outside that footprint, including any pre-existing `plugins/monkeybars/` directory in the consumer project. Hook installs are advisory: they inject or preserve workflow context at lifecycle events but never block tool calls or mutate workflow files. `removeMonkeyBarsHooks` identifies prior MonkeyBars entries by the `monkeybars-workflow-context.js` substring in the command, so re-running `install` is idempotent. If a user config file is present but unparseable, the installer warns and skips *that target's* hooks while still installing core assets.

`markdown.ts` + `git.ts` provide the small parsers `check.ts` relies on (phase label parsing, task-id normalization, `git status --porcelain`, `git log --oneline -n`).

### Workflow concepts that shape the code

The commands under `workflow-src/commands/` implement a repo-local planning loop that the CLI only has to *verify*, not execute: `docs/agents/plan.md` is the active plan; `docs/agents/work/phase-N.md` files hold reviewable chunks of tasks; `docs/agents/status.md` is the pointer (active phase, current task, state, last commit, WIP files). The invariants enforced by `runCheck` reflect this model — e.g. "current task must be the first unchecked task in the active phase file" and "phase label in status must match the phase file title."

`/review-work` produces a self-contained review artifact under `docs/agents/reviews/YYYY-MM-DD-<sha>.md` for task commits that have landed since the last review. The skill is read-only with respect to workflow state — it does not mutate `status.md`, plan, or phase files, and does not commit. Auto-scope is anchored by the `**reviewed_through:** <sha>` line in the newest prior review; helpers for that resolution live in `cli/src/review-scope.ts`.

`/start-session` and `/project-status` each include a passive nudge step that prints `Unreviewed: N commits since YYYY-MM-DD.` when task commits have landed beyond the newest review's `reviewed_through:`, and say nothing otherwise. The skill instructions mirror the logic in `cli/src/review-nudge.ts` (which is reserved for any future CLI-side surfacing); date comes from the review filename prefix, falling back to `git log -1 --format=%cs <sha>` when the filename does not match `YYYY-MM-DD-<sha>.md`.

`docs/agents/todo/` is the single parking lot for deferred work. Files under it are free-form slug-named markdown — anything from a one-line thought to a fully-scoped proposal, no required shape. `brainstorm-plan` reads this directory in its exploration step when proposing new scope, and deletes any incorporated todo in the same commit as the new plan. No CLI reads this directory; it is a file-naming convention, not a command surface.

## Coding Style & Naming Conventions

Use Markdown for workflow content and keep instructions direct, imperative, and tool-agnostic unless a command is explicitly platform-specific. Command source files should be lowercase kebab-case, for example `start-session.md`, and must include `name` and `description` frontmatter. TypeScript code uses strict `tsconfig` options and Node/Bun standard APIs. Avoid adding runtime dependencies unless they clearly pay for themselves; `commander` is the only one today.

## Testing Guidelines

Validate changes by running `bun run test`, regenerating adapters, and reviewing the diff. For command changes, confirm both generated targets are updated: `monkeybars/skills/<command>/SKILL.md` and `monkeybars/commands/<command>.md`. For template changes, confirm copies under `monkeybars/templates/`. For CLI packaging changes, confirm `monkeybars/bin/` is updated. If adding CLI, hook, or generator behavior, add small focused Bun tests.

## Commit & Pull Request Guidelines

Recent history uses short subjects, with Conventional Commit style for features, such as `feat: Initial workflows`. Prefer `type: summary` when practical (`feat`, `fix`, `docs`, `chore`). Pull requests should describe the workflow change, list affected commands/templates, mention whether adapters were regenerated, and include relevant before/after snippets for user-facing command behavior.

## Agent-Specific Instructions

Edit canonical workflow files in `workflow-src/` first, then regenerate adapters. Edit CLI, hook, and generator behavior in `cli/src/`. Do not hand-edit generated plugin files under `monkeybars/commands/`, `skills/`, `templates/`, `hooks/`, or `bin/` unless the generator itself is being changed.

Workflow skills (`/start-session`, `/complete-task`, `/create-phase`, etc.) have preconditions in their "When to use" sections. If a skill is invoked on state that doesn't match — for example `/complete-task` when there is no open TXX because the work was planning or design iteration rather than task implementation — refuse the skill, explain the mismatch, and recommend the correct action (usually a plain `docs:` commit). Do not bend workflow state to fit the skill.
