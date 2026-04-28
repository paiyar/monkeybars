# Phase 1 — Move MonkeyBars docs to docs/agents/

> Source: active docs/agents/plan.md, Phase 1

## Goal

Cut every workflow file path from `docs/` to `docs/agents/` in one
coherent phase so the repo is fully migrated at the phase boundary.

## Acceptance

- `bun run test` passes with every fixture on the new path.
- `bun run generate:check` passes.
- `grep -R 'docs/status.md\|docs/plan.md\|docs/work/\|docs/prd/' cli/ workflow-src/ test/ README.md AGENTS.md`
  returns no hits outside of archived content.
- Preflight: `bun run test`, `bun run generate:check`.

## Status

- **State:** in_progress
- **Current task:** T04 — Move existing archive and design note into the new tree
- **Last commit:** feat(T03): point workflow source and generated adapters at docs/agents/
- **Preflight:** bun run test ✅ 133 pass, bun run generate:check ✅ (2026-04-28)
- **Blockers:** none
- **WIP files:** none

## Tasks

- [x] T01 — Centralize CLI workflow path constants | files: `cli/src/paths.ts` (new), `cli/src/workflow-state.ts`, `cli/src/check.ts`, `cli/src/markdown.ts`, `cli/src/index.ts` | verify: `bun run test`
  - Acceptance: every `"docs/status.md"`, `"docs/plan.md"`, `"docs/work"`, `"docs/prd"`, and `"docs/archive/plans"` literal in `cli/src/` reads from a single constants source. No path semantics change (still `docs/`). `bun run test` passes unchanged.
- [x] T02 — Flip CLI path constants to docs/agents/ and update fixtures | files: `cli/src/paths.ts`, `test/` fixtures and assertions | verify: `bun run test`
  - Acceptance: the constants from T01 now point at `docs/agents/*`. Every affected test fixture and assertion uses the new paths. `bun run test` passes.
- [x] T03 — Update workflow source commands and templates to docs/agents/ | files: `workflow-src/commands/*.md`, `workflow-src/templates/{status,plan,phase}.md` (and any other referencing templates), regenerated `monkeybars/` | verify: `bun run test`, `bun run generate:check`
  - Acceptance: no `docs/status.md`, `docs/plan.md`, `docs/work/`, `docs/prd/`, or `docs/archive/` reference remains in `workflow-src/`. Generated adapters under `monkeybars/` are regenerated and match source. `bun run generate:check` passes.
- [ ] T04 — Move existing archive and design note into the new tree | files: `docs/archive/plans/*` → `docs/agents/archive/plans/`, `docs/agent-native-workflow-hooks.md` → `docs/agents/design-notes/agent-native-workflow-hooks.md` | verify: `bun run test`
  - Acceptance: the four files are moved with `git mv` (history preserved). `docs/archive/` and `docs/agent-native-workflow-hooks.md` no longer exist at their old paths. `bun run test` passes.
- [ ] T05 — Update README and AGENTS.md path references | files: `README.md`, `AGENTS.md` | verify: `bun run test`, `bun run generate:check`
  - Acceptance: every human-visible mention of a MonkeyBars workflow file under `docs/` in `README.md` and `AGENTS.md` now points at `docs/agents/`. Grep acceptance from the phase Acceptance section passes. `bun run test` and `bun run generate:check` both pass.

## Coverage

| Plan item | Task | Status |
|---|---|---|
| Goal: full cutover from docs/ to docs/agents/ | T01, T02, T03, T04, T05 | covered |
| Deliverable: CLI path constants centralized and updated | T01, T02 | covered |
| Deliverable: workflow-src commands and templates use docs/agents/ | T03 | covered |
| Deliverable: README + AGENTS.md path references updated | T05 | covered |
| Deliverable: existing archive and design note moved via git mv | T04 | covered |
| Deliverable: test fixtures and assertions updated | T02 | covered |
| Acceptance: `bun run test` passes | T01, T02, T03, T04, T05 | covered |
| Acceptance: `bun run generate:check` passes | T03, T05 | covered |
| Acceptance: grep for old paths returns no hits | T02, T03, T04, T05 | covered |

## Log

- 2026-04-28: Completed T03. Rewrote all `docs/status.md`, `docs/plan.md`, `docs/work/`, `docs/prd/`, and `docs/archive/` references across 4 `workflow-src/templates/*.md` and 10 `workflow-src/commands/*.md` to `docs/agents/…`; `bun run generate` regenerated 20 adapter files under `monkeybars/` (templates + commands + skills). Fixed three `test/workflow_content.test.ts` assertions that were missed by T02 (`docs/prd/` and `docs/archive/` literals in the expected strings). Project-local agent adapters under `.claude/`, `.opencode/`, `.codex/` are gitignored and out of scope; they'll refresh next `bun dist/index.js install --project .`. Acceptance grep `grep -R 'docs/status\.md\|docs/plan\.md\|docs/work/\|docs/prd/' cli/ workflow-src/ test/` returns 0 hits. `bun run test` 133 pass, `bun run generate:check` green. Next task T04 — Move existing archive and design note into the new tree with `git mv`; commit subject `feat(T03): point workflow source and generated adapters at docs/agents/`.
- 2026-04-28: Handoff. T03 still pending. Since T02 four unrelated commits landed on `main`: `d96afc2 fix: bootstrap deps during git prepare`, `110a56c test: harden npm pack file guardrail`, `13fa699 docs: capture Codex skill distribution follow-up`, and `2878240 docs: require --install-links=true for global git installs` (committed during this handoff). Preflight (`bun run test` 133 pass, `bun run generate:check` up to date) ran at `13fa699` immediately before the install-links commit; the install-links commit only touches `README.md`, `monkeybars/README.md`, and `docs/agents/todo/npm-git-install-links.md`, so the green result still holds. Worktree now clean other than this handoff's status/phase edits.
- 2026-04-28: Completed T02; next task T03 — Update workflow source commands and templates to docs/agents/; commit subject `feat(T02): flip MonkeyBars workflow paths to docs/agents/`.
- 2026-04-27: Completed T01; next task T02 — Flip CLI path constants to docs/agents/ and update fixtures; commit subject `refactor(T01): centralize CLI workflow path constants`.
