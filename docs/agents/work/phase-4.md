# Phase 4 — Formalize `docs/agents/todo/` as the parking lot

> Source: active docs/agents/plan.md, Phase 4

## Goal

Make `docs/agents/todo/` the single parking surface for deferred work, wire
`brainstorm-plan` to consult it, document the delete-on-pickup rule, and
document the PRD-update-only-on-design-shift rule.

## Acceptance

- `workflow-src/commands/brainstorm-plan.md` step 1 lists `docs/agents/todo/`
  in its exploration bullets.
- `workflow-src/commands/brainstorm-plan.md` step 7 documents: (a)
  delete-on-pickup for incorporated todos, (b) PRD-update-only-on-design-shift.
- `AGENTS.md` references `docs/agents/todo/` as the parking lot.
- Generated adapters under `monkeybars/skills/brainstorm-plan/SKILL.md` and
  `monkeybars/commands/brainstorm-plan.md` match source.
- `bun run test` and `bun run generate:check` pass.
- Preflight: `bun run test`, `bun run generate:check`.

## Status

- **State:** in_progress
- **Current task:** T15 — Add AGENTS.md pointer to `docs/agents/todo/` as the parking lot
- **Last commit:** feat(T14): wire brainstorm-plan to docs/agents/todo parking lot
- **Preflight:** n/a
- **Blockers:** none
- **WIP files:** none

## Already-satisfied plan deliverables

These Phase 4 plan.md deliverables landed before this phase file existed and
need no task in this phase:

- `docs/agents/prd/spec.md` — already uses parking-lot language and has no
  `ideas.md` references.
- `docs/agents/prd/architecture.md` — already contains the "Parked todos
  directory" component.
- `docs/agents/todo/todo-and-parking-flow.md` — already exists (free-form).

If any of these drift during Phase 4 execution, fold a small fixup into the
relevant task below rather than opening a new task.

## Tasks

- [x] T14 — Wire `brainstorm-plan` to consult `docs/agents/todo/` and document the two rules | files: `workflow-src/commands/brainstorm-plan.md`, regenerated `monkeybars/skills/brainstorm-plan/SKILL.md`, `monkeybars/commands/brainstorm-plan.md`, Codex plugin copy | verify: `bun run test`, `bun run generate:check`
  - Acceptance: Step 1 exploration bullets include `docs/agents/todo/` alongside `README.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/`. Step 7 adds two rules: (a) "if a parked todo is incorporated into the new plan, delete the todo file in the same commit as the new plan" and (b) "update `docs/agents/prd/spec.md` and `docs/agents/prd/architecture.md` only when the design shifts (component added, removed, renamed, or gains a new responsibility); for pure phase reshuffles or acceptance tweaks, edit `docs/agents/plan.md` only." `brainstorm-plan` remains free to introduce new scope not sourced from any todo. Adapters regenerate clean via `bun run generate` and `bun run generate:check` passes. No other behavior changes.
- [ ] T15 — Add AGENTS.md pointer to `docs/agents/todo/` as the parking lot | files: `AGENTS.md` | verify: `bun run generate:check`
  - Acceptance: `AGENTS.md` contains a short sentence identifying `docs/agents/todo/` as the parking lot for deferred work. Placement is wherever the existing MonkeyBars workflow guidance lives (agent-specific instructions section or project structure section — pick whichever is closer topically). No other behavior changes. `bun run generate:check` passes (no stale adapters).
- [ ] T16 — Dogfood the parking-lot wiring on this repo | files: none committed (manual smoke) or a new entry under `docs/agents/todo/` if a rough edge surfaces | verify: manual smoke
  - Acceptance: After T14–T15 land, mentally (or literally) walk `brainstorm-plan` through proposing a new scope using at least one existing file under `docs/agents/todo/` (for example `auto-continue-between-deterministic-steps.md` or `review-nudge-non-md-files.md`). Confirm: (a) the skill body clearly directs the reader to read `docs/agents/todo/` in step 1; (b) the delete-on-pickup rule is unambiguous about *when* (same commit as the new plan) and *what* (the todo file); (c) the PRD-update rule is clear about which shifts justify editing `spec.md` / `architecture.md` vs editing `plan.md` only. Rough edges become parked todos under `docs/agents/todo/`, not inline fixes.

## Coverage

| Plan item | Task | Status |
|---|---|---|
| Goal: `docs/agents/todo/` as parking lot wired into `brainstorm-plan` | T14 | covered |
| Deliverable: `brainstorm-plan` step 1 adds `docs/agents/todo/` to exploration | T14 | covered |
| Deliverable: `brainstorm-plan` step 7 delete-on-pickup rule | T14 | covered |
| Deliverable: `brainstorm-plan` step 7 PRD-update-only-on-design-shift rule | T14 | covered |
| Deliverable: `docs/agents/prd/spec.md` drops `ideas.md` refs, describes todo/ | n/a | already done |
| Deliverable: `docs/agents/prd/architecture.md` Parked-todos component | n/a | already done |
| Deliverable: `docs/agents/todo/todo-and-parking-flow.md` new | n/a | already done |
| Deliverable: AGENTS.md pointer to `docs/agents/todo/` | T15 | covered |
| Deliverable: regenerated adapters | T14 | covered |
| Acceptance: `brainstorm-plan` explicitly lists `docs/agents/todo/` + documents both rules | T14 | covered |
| Acceptance: spec.md + architecture.md have no `ideas.md` refs | n/a | already satisfied |
| Acceptance: `todo-and-parking-flow.md` exists | n/a | already satisfied |
| Acceptance: `AGENTS.md` references `docs/agents/todo/` | T15 | covered |
| Acceptance: `bun run test` passes | T14, T15 | covered |
| Acceptance: `bun run generate:check` passes | T14, T15 | covered |

## Log

- 2026-04-29: Completed T14; next task T15 — Add AGENTS.md pointer to `docs/agents/todo/` as the parking lot; commit subject `feat(T14): wire brainstorm-plan to docs/agents/todo parking lot`.
(Append dated entries as work progresses)
