# GSD-Inspired MonkeyBars Improvement Plan

> Date: 2026-04-27
> Source comparison: `/Users/paiyar/git/get-shit-done`
> Scope: selectively bring GSD strengths into MonkeyBars without copying GSD's
> large command, agent, and SDK surface.

## Context

MonkeyBars and GSD solve the same broad problem: keep agent-built software work
from rotting inside a long chat context. They make different tradeoffs.

MonkeyBars is small, repo-local, transparent, and generator-centric. Its current
strength is that a software engineer can understand the whole system quickly:
canonical workflow commands in `workflow-src/`, generated adapters in
`plugins/monkeybars/`, and deterministic CLI support around `status`, `check`,
`preflight`, `advance`, and `doctor`.

GSD is much larger and more mature as a product. Its strongest ideas are not the
number of commands or agents. The reusable strengths are:

- deterministic next-step routing
- health and repair diagnostics
- brownfield codebase mapping
- planner coverage audits
- verification heuristics that catch fake or stubbed work
- context and prompt-safety guardrails
- CI parity tests that keep docs, shipped files, and package manifests aligned

This plan imports those strengths in a MonkeyBars-native way: small CLI
features, focused workflow commands, and tests that preserve lean operation.

## Goals

- Make the next action obvious from repo state without relying on LLM inference.
- Improve brownfield planning by documenting current code before target design.
- Catch scope drops, placeholder implementation, stale workflow state, and
  broken installs earlier.
- Keep all new behavior inspectable, deterministic where practical, and
  optional when it adds runtime overhead.
- Preserve MonkeyBars' current identity: a small engineering workflow, not a
  broad autonomous agent platform.

## Non-Goals

- Do not copy GSD's 80+ command surface.
- Do not add a general subagent framework or an SDK query registry.
- Do not make hooks blocking by default.
- Do not add workstreams, autonomous multi-phase execution, user profiling, or
  broad runtime conversion support.
- Do not replace `docs/plan.md`, `docs/work/phase-N.md`, and `docs/status.md`
  with a new `.planning/` state model.

## Design Principles

- **Read-only first:** new routing and diagnostics should start as read-only
  commands before any repair or auto-execution behavior is added.
- **Agent assistance, not agent authority:** the CLI should produce facts and
  recommended commands. The user or agent still decides whether to continue.
- **Advisory hooks only:** hooks may add context or warnings but must not block
  tool calls, mutate workflow files, or commit.
- **Small files beat rich frameworks:** prefer one focused Markdown artifact or
  CLI command over a new framework layer.
- **Tests lock behavior:** every new workflow invariant should have a small test
  before it becomes part of the user-facing loop.

## Phase 1 - Add `monkeybars next`

**GSD source strength:** `/gsd-next` and `route.next-action` encode "what now?"
from durable state instead of asking the agent to infer it from scattered docs.

**Goal:** Provide a deterministic read-only next-step recommendation.

**User surface:**

```sh
monkeybars next
monkeybars next --json
```

**Behavior:**

- Read `docs/status.md`, active `docs/work/phase-N.md`, `docs/plan.md`, and
  `git status --porcelain`.
- Run the same core consistency checks used by `monkeybars check`.
- Print:
  - current phase
  - current task
  - state
  - dirty-worktree summary
  - blockers
  - recommended next command
  - reason for the recommendation

**Initial routing rules:**

- Missing workflow files -> recommend `$initialize-monkeybars` or
  `/initialize-monkeybars`.
- Check errors -> recommend `monkeybars check`.
- WIP files documented or dirty worktree -> recommend `handoff-session` or
  task continuation depending on state.
- Current task incomplete -> recommend `start-session`.
- Current task complete but tracking not advanced -> recommend `complete-task`.
- Phase complete with next plan phase available -> recommend `create-phase`.
- Active plan exhausted -> recommend `brainstorm-plan`.

**Implementation notes:**

- Add routing logic beside `summarizeWorkflow` in `cli/src/workflow-state.ts`.
- Add CLI wiring in `cli/src/index.ts`.
- Add fixtures in `test/workflow_state.test.ts` or a new `test/next.test.ts`.
- Update `workflow-src/commands/project-status.md` and `start-session.md` to
  mention `monkeybars next`.

**Tradeoffs:**

- Good: removes repeated LLM state reconstruction.
- Good: gives the engineer a quick command-line answer before opening an agent.
- Risk: bad routing can nudge users in the wrong direction.
- Mitigation: keep it read-only and explain the reason for every recommendation.

## Phase 2 - Add `monkeybars health`

**GSD source strength:** `/gsd-health` and `validate.health` separate structural
project health from active task consistency.

**Goal:** Diagnose whether a MonkeyBars project is structurally usable.

**User surface:**

```sh
monkeybars health
monkeybars health --json
monkeybars health --repair
```

**Checks:**

- `docs/status.md` exists and has a parseable structured status block.
- `docs/plan.md` exists and has unique phase headings.
- Active phase file exists.
- Active phase appears in the plan with matching number and title.
- Active phase tasks use the expected checkbox task format.
- Each unchecked task has a task id, description, `files:` hint, and `verify:`
  hint where possible.
- `AGENTS.md` exists and has a `## Preflight Checks` section, or explicitly
  says no preflight is available.
- Generated adapters are current with `checkGeneratedAdapters`.
- Installed hooks are either present, skipped by user choice, or absent with a
  clear warning.

**Repair policy:**

Only repair low-risk, additive issues:

- Add or refresh the structured status block via existing `migrateStatus`.
- Create missing `docs/work/` directory.
- Add missing generated marker files by running generation when source and
  output paths are inside this repo.

Do not repair:

- missing or vague plan content
- phase task rewrites
- `AGENTS.md` policy
- hook config parse failures
- git history inconsistencies

**Implementation notes:**

- Build on `doctor`, `runCheck`, `readPlanPhases`, and `readPhaseFile`.
- Add severity-coded findings similar to `CheckResult`.
- Add tests for each error and repairable warning.
- Consider splitting `doctor` into environment diagnostics and `health` into
  workflow integrity.

**Tradeoffs:**

- Good: distinguishes "state mismatch" from "project not properly set up."
- Good: gives support/debugging a standard first command.
- Risk: `--repair` can become too ambitious.
- Mitigation: make repair conservative and report every write before/after.

## Phase 3 - Add Lightweight Codebase Mapping

**GSD source strength:** `map-codebase` creates current-state reference docs
before brownfield planning.

**Goal:** Improve brownfield adoption by documenting what exists before planning
what should change.

**User surface:**

```text
/map-codebase
```

Potential later CLI:

```sh
monkeybars map-codebase --paths src,packages/api
```

**Output files:**

- `docs/prd/current-stack.md`
- `docs/prd/current-architecture.md`
- `docs/prd/current-testing.md`
- `docs/prd/current-risks.md`

Each file should include:

- analysis date
- git commit hash
- source paths inspected
- concise findings with concrete file references
- "refresh when" guidance

**Workflow behavior:**

- Add a new canonical command in `workflow-src/commands/map-codebase.md`.
- Include focused templates under `workflow-src/templates/`.
- In `initialize-monkeybars`, recommend `map-codebase` when existing code is
  detected but current-state docs are absent.
- In `brainstorm-plan`, prefer current-state docs before writing target
  architecture for brownfield work.

**Keep it smaller than GSD:**

- No required subagents.
- No seven-document output in v1.
- No background parallel mapping requirement.
- No automatic incremental remap gate yet.

**Tradeoffs:**

- Good: prevents target architecture from being invented without reading code.
- Good: gives future sessions stable references to current conventions.
- Risk: docs can go stale and mislead planning.
- Mitigation: stamp commit hash and add `monkeybars health` warnings when maps
  are old relative to touched files or active phase scope.

## Phase 4 - Add Plan Coverage Audits

**GSD source strength:** planner source audits prevent silent scope reduction.

**Goal:** Make phase creation prove that tasks cover the active plan.

**Workflow additions:**

- Extend the phase template with:

```markdown
## Coverage

| Plan item | Task | Status |
|---|---|---|
| Phase goal | T01, T02 | covered |
| Acceptance: [item] | T02 | covered |
```

- Update `create-phase` to require coverage rows when creating a phase from
  `docs/plan.md`.
- Update `brainstorm-plan` to write clearer plan item identifiers or acceptance
  bullets that can be referenced by phase coverage.
- Update `monkeybars check` to warn when:
  - a phase has no `## Coverage` section
  - coverage references task ids that do not exist
  - required plan acceptance bullets are not referenced by any task

**Tradeoffs:**

- Good: makes it harder for an agent to turn a real requirement into a weak
  placeholder task.
- Good: review can see why each task exists.
- Risk: adds ceremony to small changes.
- Mitigation: make coverage required for generated phase files, warning-only for
  legacy or manually created files.

## Phase 5 - Strengthen Verification Without Building a Verification Platform

**GSD source strength:** verification patterns distinguish real implementation
from file existence.

**Goal:** Improve task `verify:` quality and catch obvious placeholder work.

**Additions:**

- Add `workflow-src/templates/verification-patterns.md` or a shorter section in
  `phase.md` describing acceptable `verify:` commands.
- Add `monkeybars verify-task --task TXX --dry-run` later only if repeated
  manual verification pain appears.
- In `monkeybars check`, warn when task verification is weak:
  - `verify: n/a`
  - `verify: manual` without acceptance details
  - no automated command for code changes
  - placeholders such as `[command]`, `TODO`, or `coming soon`

**Stub heuristics to borrow lightly:**

- flag placeholder markers in files touched by the current task when those files
  are documented in the phase
- flag `return null`, `return []`, or "not implemented" only as advisory
  warnings, never as proof of failure
- surface findings in `complete-task` before commit if practical

**Tradeoffs:**

- Good: catches common vibe-code failure modes.
- Risk: regex checks have false positives.
- Mitigation: warning-only, path-scoped, and never block commits.

## Phase 6 - Add Optional Safety Hooks

**GSD source strength:** advisory hooks catch read-before-edit loops, prompt
injection in planning docs, and context exhaustion warnings.

**Goal:** Add opt-in guardrails for weaker runtimes without making hooks noisy
for everyone.

**Potential hooks:**

- `read-before-edit` advisory for runtimes that do not enforce read-before-write.
- `planning-prompt-injection` advisory when content written to `docs/` contains
  suspicious instruction override patterns.
- `workflow-bypass` advisory when editing implementation files while
  MonkeyBars is initialized but no active task is loaded.

**Install policy:**

- Keep existing session context hooks default.
- Make new safety hooks opt-in:

```sh
monkeybars install --safety-hooks --project /path/to/repo
```

or project-local configuration later:

```toml
[monkeybars.hooks]
safety = true
```

**Tradeoffs:**

- Good: prevents common agent loops and poisoned planning context.
- Risk: noisy hooks train users and agents to ignore warnings.
- Mitigation: opt-in, advisory only, short messages, and tests for no-op cases.

## Phase 7 - Add CI And Size-Budget Guardrails

**GSD source strength:** many GSD tests are parity guards: docs match shipped
files, inventories are real, package manifests include required assets, and
large prompt files stay within budgets.

**Goal:** Prevent MonkeyBars from growing accidentally or shipping broken
artifacts.

**Add tests:**

- Command inventory parity:
  - every `workflow-src/commands/*.md` appears in README or plugin README
  - every generated command and skill exists for every source command
- Template inventory parity:
  - every `include_templates` name resolves to a template
  - every template copied to `plugins/monkeybars/templates/`
- Package manifest parity:
  - `package.json.files` includes every shipped generated asset family
  - `npm pack --dry-run` contains `dist/index.js`, plugin metadata, commands,
    skills, templates, and hooks
- Size budgets:
  - command source files under a default line limit unless explicitly listed
  - hook scripts under a default line limit
  - README command table matches source command list

**Tradeoffs:**

- Good: protects MonkeyBars' lean product shape.
- Good: catches release packaging bugs before users do.
- Risk: brittle tests if docs are intentionally curated.
- Mitigation: allow curated docs, but require every shipped surface to appear in
  at least one inventory or README section.

## Suggested Sequence

1. `monkeybars next`
2. `monkeybars health`
3. CI/package/size guardrails
4. lightweight `map-codebase`
5. plan coverage audits
6. verification warnings
7. optional safety hooks

The first three phases improve the existing product without changing the mental
model. The later phases add more workflow capability and should be added only
with tests and clear docs.

## Success Criteria

- A user can run one read-only command to know the next MonkeyBars action.
- A user can distinguish workflow state errors from install/setup health
  problems.
- Brownfield initialization produces current-state docs before target plans.
- Generated phases can show which plan items each task covers.
- Weak verification and obvious placeholder implementation are surfaced before
  commit.
- New hooks remain advisory and opt-in when they are not pure context loading.
- MonkeyBars remains small enough that a contributor can understand the repo in
  one sitting.

## Explicit Rejections

Do not adopt these GSD patterns unless the product direction changes:

- large command catalog
- always-installed specialized agents
- autonomous multi-phase execution
- workstream management
- global user profiling
- broad multi-runtime installer matrix
- large SDK query layer

These are valid GSD strengths, but they conflict with MonkeyBars' current value:
clear, minimal, repo-local workflow control for software engineers using agents.
