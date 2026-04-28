# MonkeyBars Improvement Plan

> Date: 2026-04-26
> Companion: `docs/2026-04-26-review.md`

## Context

The 2026-04-26 audit identified thirteen weaknesses ranging from an install
gate (Bun-on-PATH) to structural issues (markdown-as-DB in `status.md`, no
drift check on generated files, destructive install). This plan addresses
every finding, grouped into phases sized for one reviewable commit each and
sequenced so each phase is independently shippable.

## Goals

- Remove the Bun-on-PATH install gate without dropping Bun for development.
- Make installs safe on repos that already use `.claude/skills/` or
  `.opencode/commands/`.
- Turn `monkeybars` from a verifier into a deterministic state machine:
  read (`status`), verify (`check`), advance (`advance`), run preflight
  (`preflight`), and diagnose (`doctor`).
- Make generated files self-identifying and CI-checkable.
- Reach lifecycle-hook parity across Claude, Codex, and OpenCode.
- Replace markdown-as-DB in `status.md` with a structured block that is
  parser-friendly and agent-friendly.

## Non-Goals

- No new persona/roleplay surface (BMAD-style).
- No repo-map ingestion (Aider-style).
- No blocking hooks. Hooks stay advisory.
- No rewrite of the generator; only extensions.

## Phases

Phase numbers below are plan phases, not `docs/work/phase-N.md` numbers; when
this plan is adopted, renumber into the active workflow.

### Phase 1 — Node-compatible runtime (addresses W1)

**Goal:** A user with only Node on PATH can install and run MonkeyBars.

- Change `package.json:build` to emit a Node-target ESM bundle:
  `bun build cli/src/index.ts --target=node --format=esm --outdir=dist`.
- Change the `dist/index.js` shebang strategy: keep Bun for development, but
  have the emitted bundle use `#!/usr/bin/env node`. Implement by using a
  build banner (`--banner='#!/usr/bin/env node'`) or a small post-build
  rewrite in `cli/src/generate.ts`.
- Replace `Bun.TOML.parse` in `install.ts:309,320` with a minimal TOML
  validator (we only need "is this parseable and does `[features]` have
  `codex_hooks = true`"). Either vendor a ~150-line TOML parser or — simpler
  — keep the current regex-based `codexConfigWithHooksEnabled` and drop the
  pre-parse; the round-trip validation gives no value once the output is
  deterministic.
- Hook shebangs: `workflow-src/hooks/shared/monkeybars-workflow-context.js`
  and `workflow-src/hooks/opencode/monkeybars-workflow.js` already run as
  plain JS. Change the installed Claude command from
  `bun "$CLAUDE_PROJECT_DIR"/.claude/hooks/monkeybars-workflow-context.js claude`
  to `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/monkeybars-workflow-context.js claude`
  (same for Codex in `install.ts:337`).
- Update `engines` in `package.json` to `{ "node": ">=20" }` and drop the
  hard `bun` engine pin. Keep Bun as a `devEngines` hint.
- Add a CI job that installs the published tarball with `npm -g` using only
  Node and runs `monkeybars check` + `monkeybars install` in a scratch repo.

**Files:** `package.json`, `cli/src/install.ts`, `cli/src/generate.ts`,
`workflow-src/hooks/shared/monkeybars-workflow-context.js`, README install
section.

### Phase 2 — Non-destructive install (addresses W5)

**Goal:** `monkeybars install` never deletes a user's existing skills or
commands.

- Namespace all installed assets under a `monkeybars/` subdirectory:
  - Claude skills: `.claude/skills/monkeybars/<skill>/SKILL.md`
  - OpenCode commands: `.opencode/commands/monkeybars/<command>.md`
  - Codex plugin (see Phase 10): `.codex/plugins/monkeybars/`
- Replace `replaceDirectory` in `install.ts:70-106` with a two-step:
  1. `rmSync` only the `monkeybars/` subdirectory, not its parent.
  2. Recopy into that subdirectory.
- Keep idempotency: re-running install wipes only MonkeyBars-owned files.
- Verify: `install.test.ts` already seeds a `project-status.md` at the old
  path; extend it to also seed a non-MonkeyBars sibling skill and assert it
  survives.

**Files:** `cli/src/install.ts`, `test/install.test.ts`, README + plugin
README install sections.

**Compatibility note:** Claude Code and OpenCode both recurse into
subdirectories for skills/commands, so the namespaced layout still resolves
the same slash commands. Document the one-time migration path ("remove old
top-level `start-session.md` etc. on first run after upgrade").

### Phase 3 — Generation headers and drift CI (addresses W3)

**Goal:** Hand-edits to generated files are impossible to merge silently.

- In `generator.ts`:
  - `renderSkill` and `renderOpenCodeCommand` each prepend a line after the
    frontmatter: `<!-- Generated from workflow-src/commands/<name>.md — do not edit. -->`.
  - `copyTemplates` / `copyDirectory` / `copyCli` write a sibling
    `.generated` marker file in each target root containing the source
    commit SHA (from `git rev-parse HEAD` at generate time) and a
    human-readable warning.
- Add `cli/src/generate.ts --check` mode that regenerates into a temp dir
  and exits non-zero if the output differs from `plugins/monkeybars/`.
- Add a GitHub Action that runs `bun run generate` and then
  `git diff --exit-code -- plugins/monkeybars` on every PR.

**Files:** `cli/src/generator.ts`, `cli/src/generate.ts`,
`.github/workflows/ci.yml` (new), `test/generator.test.ts`.

### Phase 4 — `monkeybars status` and `monkeybars advance` (addresses W7)

**Goal:** Turn the CLI into a deterministic state machine so agents stop
re-deriving state from markdown on every turn.

- `monkeybars status [--json]`: read-only. Prints
  - active plan scope
  - phase number + title
  - current task id + description
  - state
  - last commit (and whether it appears in `git log`)
  - dirty files (from `git status --porcelain`)
  - next recommended command (`start-session` if state is `not_started`,
    `complete-task` if first unchecked task has no WIP, `handoff-session` if
    WIP present, `brainstorm-plan` if all phases complete).
  Reuses `readStatusFile`, `readPhaseFile`, `gitStatus`, `recentCommits`.
- `monkeybars advance --task <id> --commit <subject> [--complete-phase]`:
  - Verify current task matches `<id>` and is the first unchecked task.
  - Verify `<commit>` exists in `git log`.
  - Check off the task in the active phase file.
  - Update `Current task`, `Last commit`, `State` (to `in_progress` on first
    task; to `complete` when no unchecked tasks remain).
  - Update `docs/status.md` to match and set `Last updated` to today.
  - Append a Log entry with the commit subject.
  - All writes are transactional: build the new content in memory, then
    `writeFileSync` both files; if either write throws, no partial state.
- Update `complete-task.md` to delegate the file-mutation steps to
  `monkeybars advance` and only keep the preflight/commit/advisory parts as
  LLM work.

**Files:** `cli/src/index.ts`, `cli/src/status.ts` (new),
`cli/src/advance.ts` (new), `cli/src/markdown.ts` (add a `writeStatusFile` /
`writePhaseFile` that round-trips through the parser),
`workflow-src/commands/complete-task.md`, `test/status.test.ts` (new),
`test/advance.test.ts` (new).

### Phase 5 — `monkeybars preflight` (addresses W8, W9)

**Goal:** Preflight is deterministic, not "hope the agent reads `AGENTS.md`
correctly."

- Wire the already-written `extractPreflightCommands` in `markdown.ts:103-122`
  into a new `monkeybars preflight [--dry-run]` subcommand.
- Reads `AGENTS.md` from the project root, extracts the `## Preflight Checks`
  code fence, and runs each command with `execFileSync` (via a shell split
  helper — document that pipes/redirects require wrapping in `sh -c`).
- `--dry-run` prints the commands without running them, which agents can
  use to sanity-check the parse.
- Exits non-zero if any command fails; streams stdout/stderr through.
- Update `complete-task.md` to call `monkeybars preflight` instead of
  "Read `AGENTS.md` to find the project's documented preflight checks."

**Files:** `cli/src/preflight.ts` (new), `cli/src/index.ts`,
`workflow-src/commands/complete-task.md`, `test/preflight.test.ts` (new).

### Phase 6 — `docs/plan.md` schema in `check` (addresses W4)

**Goal:** `monkeybars check` catches plan/status drift, not just status/phase
drift.

- Add `readPlanFile(path)` to `cli/src/markdown.ts`: returns `{ path, phases:
  Array<{ number, title, line }> }`, parsed by matching
  `^## Phase (\d+)\s+[—-]\s+(.+)$`.
- In `runCheck`:
  - Require the active phase number to appear in `docs/plan.md`.
    New error code: `active-phase-missing-from-plan`.
  - Require the active phase title to match. New error code:
    `active-phase-title-mismatch`.
  - Require plan phase numbers to be unique. New error code:
    `duplicate-plan-phase`.
  - Require every `docs/work/phase-N.md` phase number to be `>=` every
    plan phase number only when the plan claims "active" (see Phase 7's
    `plan.active = true`). New warning code: `plan-phase-reuses-archived-number`.
- Update fixtures in `test/check.test.ts` to seed a real plan with the phase,
  and add cases for each new code.

**Files:** `cli/src/markdown.ts`, `cli/src/check.ts`, `cli/src/types.ts`,
`test/check.test.ts`.

### Phase 7 — Structured status block (addresses W2)

**Goal:** `status.md` is tolerant to reformatting and round-trippable.

- Extend `status.md` with an HTML-comment-fenced YAML block at the top of
  the `## Active Work` section:

  ```markdown
  ## Active Work

  <!-- monkeybars:status-begin -->
  ```yaml
  plan_scope: active plan scope
  phase_file: docs/work/phase-1.md
  phase_number: 1
  phase_title: Title
  state: not_started
  current_task: T01
  last_commit: none
  last_updated: 2026-04-26
  ```
  <!-- monkeybars:status-end -->

  - **Plan scope:** ...
  ```

- Parser precedence in `readStatusFile`: prefer the fenced YAML block; fall
  back to the existing bullet parser for backwards compatibility.
- `monkeybars advance` writes the YAML block authoritatively and keeps the
  bullets in sync so humans skimming the file see the same values.
- Same treatment for the phase file `## Status` section.
- Add a `monkeybars migrate-status` subcommand to rewrite legacy status
  files. Document in README.

**Files:** `cli/src/markdown.ts`, `cli/src/advance.ts`,
`cli/src/migrate-status.ts` (new), `workflow-src/templates/status.md`,
`workflow-src/templates/phase.md`, `test/markdown.test.ts` (new).

### Phase 8 — Claude `Stop` hook matcher + OpenCode parity (addresses W6, W11)

**Goal:** Stop firing the handoff nudge on every turn; give OpenCode
session-start context.

- In `install.ts:262-271`, change the Claude `Stop` hook:
  - Add a `matcher` that gates on dirty worktree OR current task == complete,
    implemented inside the hook script (the shared context script already
    reads `git status --porcelain` cheaply).
  - Alternative: drop the `Stop` hook entirely and rely on
    `UserPromptSubmit` + the `context-boundary` slash command. Prefer this —
    Claude's `Stop` semantics are per-turn and fighting that is user-hostile.
- In `workflow-src/hooks/opencode/monkeybars-workflow.js`, register a
  second event handler for `experimental.session.starting` (or whichever is
  the current OpenCode session-start event) that emits the same context
  block as `workflowContext` does on compaction.
- Update `install.test.ts` to assert the new OpenCode hook shape.

**Files:** `cli/src/install.ts`,
`workflow-src/hooks/opencode/monkeybars-workflow.js`,
`workflow-src/hooks/shared/monkeybars-workflow-context.js`,
`test/install.test.ts`.

### Phase 9 — Codex install under `.codex/plugins/` (addresses W10)

**Goal:** Codex install never collides with a project's own `plugins/` dir.

- Change `installCodex` in `install.ts:134-152` to copy the plugin to
  `<project>/.codex/plugins/monkeybars/` and the marketplace metadata to
  `<project>/.codex/plugins/marketplace.json`.
- Update the Codex plugin manifest path references and the Codex source path
  in `.agents/plugins/marketplace.json` if needed.
- Add a one-time migration: on install, if the old
  `<project>/plugins/monkeybars/` and `<project>/.agents/plugins/marketplace.json`
  exist and match a MonkeyBars fingerprint (presence of the generation
  marker from Phase 3), remove them and print a notice.
- Update README + plugin README Codex sections.

**Files:** `cli/src/install.ts`, `.agents/plugins/marketplace.json`,
README, `plugins/monkeybars/README.md`, `test/install.test.ts`.

### Phase 10 — Hardened frontmatter parser (addresses W12)

**Goal:** Tolerate `:` in descriptions and other legal YAML values without
pulling in a YAML dependency.

- Replace the `indexOf(":")` split in `parseFrontmatter`
  (`generator.ts:76-88`) with a regex that captures up to the first
  unquoted colon followed by whitespace, and strip surrounding single or
  double quotes from the value.
- Reject keys that aren't `[a-z_]+`; reject duplicate keys; surface line
  numbers in error messages.
- Add targeted tests: description with a colon, quoted value, duplicate key,
  non-lowercase key.

**Files:** `cli/src/generator.ts`, `test/generator.test.ts`.

### Phase 11 — README onboarding bridge (addresses W13)

**Goal:** After `monkeybars install`, new users know exactly what to do next
in each target tool.

- Rewrite the README "Install" section to show, in order:
  1. Install Bun (or Node if Phase 1 is done) prerequisite, prominently.
  2. `npm install -g @paiyar/monkeybars` and `monkeybars install --project
     /path/to/repo`.
  3. **"Now open your coding tool"** subsection with one short paragraph per
     tool explaining where slash commands appear and what to type first
     (`/initialize-monkeybars` for Claude/OpenCode; `$initialize-monkeybars`
     for Codex).
- Add a single-page "First 10 minutes" example that walks greenfield through
  init → brainstorm → create-phase → start-session → complete-task, with
  expected output snippets.
- Same onboarding bridge in `plugins/monkeybars/README.md`.
- Update `workflow_content.test.ts` expectations to cover the new headings.

**Files:** `README.md`, `plugins/monkeybars/README.md`,
`test/workflow_content.test.ts`.

### Phase 12 — `monkeybars doctor` (covers remaining diagnostics)

**Goal:** A single command that tells a user what's wrong with their
MonkeyBars install + repo state, including drift between
`workflow-src/` and `plugins/monkeybars/` when run from the source repo.

- New subcommand that combines:
  - `check` (workflow state).
  - `preflight --dry-run` (surfaces that preflight is discoverable).
  - Install fingerprint check (each target's installed assets match the
    packaged plugin version).
  - Runtime check (Node/Bun version, git version, git inside work tree).
- Prints a compact report; exits non-zero only if `check` fails.

**Files:** `cli/src/doctor.ts` (new), `cli/src/index.ts`,
`test/doctor.test.ts` (new).

## Verification

- **Unit/integration:** each phase adds Bun tests; `bun run test` stays
  green at every phase boundary.
- **End-to-end per phase:**
  - Phase 1: in a Node-only Docker image, `npm i -g @paiyar/monkeybars &&
    monkeybars install --project /tmp/demo && monkeybars check` succeeds.
  - Phase 2: seed a non-MonkeyBars skill in `.claude/skills/` and confirm it
    survives a reinstall.
  - Phase 3: edit a generated file, run CI locally (`bun run generate &&
    git diff --exit-code -- plugins/monkeybars`), expect a red diff.
  - Phase 4: run `monkeybars status --json` in this repo after a commit and
    verify the JSON shape; run `monkeybars advance --task T01 --commit
    "feat(T01): ..."` in a scratch repo and confirm both files update.
  - Phase 5: `monkeybars preflight --dry-run` in this repo prints `bun run
    test` (the current preflight).
  - Phase 6: seed a plan missing the active phase; `check` reports
    `active-phase-missing-from-plan`.
  - Phase 7: rewrite `status.md` with the YAML block, run `check`, confirm
    green; corrupt the bullets only, confirm still green; corrupt the YAML,
    confirm the bullet fallback works.
  - Phase 8: start a Claude session in a seeded project, confirm no
    `Stop`-hook message appears on an ordinary turn.
  - Phase 9: install against a scratch project, confirm no
    `<project>/plugins/monkeybars/` directory is created.
  - Phase 10: author a command with `description: Foo: bar`, regenerate,
    confirm the skill file still parses.
  - Phase 11: fresh contributor reads the README top-to-bottom and produces
    a first commit in under 10 minutes (usability test with one person).
  - Phase 12: `monkeybars doctor` in this repo prints one report with all
    green sections.

## Sequencing And Risk

Ship in order 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.

- Phases 1, 2, 3 are the highest-impact and lowest-risk; ship as v0.2.0.
- Phases 4 + 5 + 7 reshape the CLI surface; release as v0.3.0 with the
  status-block migration command.
- Phases 6, 8, 9 are additive and low-risk; bundle with v0.3.0 if timing
  allows.
- Phases 10, 11, 12 are polish; ship as v0.3.1.

Each phase is one reviewable commit or a small PR; each commit prefixed
`feat:` / `fix:` / `docs:` consistent with existing history.

## Open Questions

- **Claude `Stop` hook:** drop entirely or keep with a gated matcher? Lean
  toward drop (simpler, less noise). Decide before starting Phase 8.
- **Namespace in Codex:** Codex's plugin discovery may require the
  marketplace pointer to match the path. Confirm
  `.codex/plugins/monkeybars/` is a valid discovery root before Phase 9; if
  not, keep the source path and only move the *install target*.
- **YAML dep:** Phase 10 is hand-rolled. If we grow beyond the current key
  set, it's worth pulling `yaml` (pure-JS, small). Deferred for now.

