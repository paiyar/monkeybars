# Phase 3 — Passive review nudge in `/start-session` and `/project-status`

> Source: active docs/agents/plan.md, Phase 3

## Goal

Both state commands surface one line when the current branch has unreviewed
task commits, and say nothing otherwise.

## Acceptance

- Empty `docs/agents/reviews/` → no nudge emitted.
- Review file with `reviewed_through:` matching HEAD → no nudge.
- Review file with marker 4 commits behind HEAD → nudge shows
  `Unreviewed: 4 commits since <date>.`
- `bun run test` and `bun run generate:check` pass.
- Preflight: `bun run test`, `bun run generate:check`.

## Status

- **State:** in_progress
- **Current task:** T11 — Add nudge step to `/start-session` and `/project-status` skills
- **Last commit:** feat(T10): add review-nudge resolver with tests
- **Preflight:** n/a
- **Blockers:** none
- **WIP files:** none

## Tasks

- [x] T10 — Extract nudge resolver helper and tests | files: `cli/src/review-nudge.ts` (new), `test/review-nudge.test.ts` (new) | verify: `bun run test`
  - Acceptance: Pure function `resolveNudge({ headSha, commits, reviews })` returns either `null` (no nudge) or `{ count, reviewedThrough }`. Date rendering is out of scope for the helper; the skill body (T11) owns that (filename prefix, falling back to `git log -1 --format=%cs <reviewedThrough>`). Reuses `filterTaskCommits` and `pickNewestReview` from `cli/src/review-scope.ts`; `parseReviewedThrough` is used by whatever constructs `ReviewFile` entries, not by the helper itself. Tests cover the three plan acceptance cases (empty reviews, `reviewed_through:` equals HEAD, N unreviewed task commits) plus a merge-commit-in-range case. Helper does no I/O; fixture-driven. `bun run test` passes with 4+ new cases.
- [ ] T11 — Add nudge step to `/start-session` and `/project-status` skills | files: `workflow-src/commands/start-session.md`, `workflow-src/commands/project-status.md`, regenerated `monkeybars/skills/{start-session,project-status}/SKILL.md`, `monkeybars/commands/{start-session,project-status}.md`, Codex plugin copy | verify: `bun run generate:check`
  - Acceptance: Each skill gets one new step that reads `docs/agents/reviews/`, applies the T10 resolver logic (described as instructions, not code), and prints exactly `Unreviewed: N commits since YYYY-MM-DD.` when unreviewed task commits exist, and nothing otherwise. Step placement: `/start-session` after the workflow-check / monkeybars-next step and before the final report; `/project-status` after `monkeybars next` and before the final summary. Adapters regenerate clean. `bun run generate:check` passes.
- [ ] T12 — Document the nudge in README and AGENTS.md | files: `README.md`, `AGENTS.md` | verify: `bun run generate:check`
  - Acceptance: `README.md` mentions the passive nudge one line in the `/start-session` or `/project-status` area (whichever already has the closer description). `AGENTS.md` adds one sentence under the workflow-command entries for both skills so agents discover the behavior through the canonical guide. No other behavior changes. `bun run generate:check` passes (no stale adapters).
- [ ] T13 — Dogfood the nudge on this repo | files: none committed (manual smoke) or a new entry under `docs/agents/todo/` if rough edges surface | verify: manual smoke
  - Acceptance: Run `/start-session` and `/project-status` against current branch state after T10–T12 land. Confirm: (a) before any new task commits are added, both skills emit no nudge because the latest review covers HEAD; (b) if simulated by temporarily moving `reviewed_through:` in the latest review file to an older commit, both skills emit `Unreviewed: N commits since <date>.` with the correct N and date. Revert any simulation changes before committing. Rough edges become parked todos under `docs/agents/todo/`, not inline fixes.

## Coverage

| Plan item | Task | Status |
|---|---|---|
| Goal: passive one-line nudge on unreviewed task commits | T10, T11 | covered |
| Deliverable: new step in `/start-session` | T11 | covered |
| Deliverable: new step in `/project-status` | T11 | covered |
| Deliverable: regenerated adapters | T11, T12 | covered |
| Deliverable: README + AGENTS.md mention | T12 | covered |
| Deliverable: Bun tests for nudge resolver | T10 | covered |
| Acceptance: empty reviews → no nudge | T10, T13 | covered |
| Acceptance: `reviewed_through:` equals HEAD → no nudge | T10, T13 | covered |
| Acceptance: marker N behind HEAD → `Unreviewed: N commits since <date>.` | T10, T11, T13 | covered |
| Acceptance: `bun run test` passes | T10 | covered |
| Acceptance: `bun run generate:check` passes | T11, T12 | covered |

## Log

- 2026-04-29: Completed T10; next task T11 — Add nudge step to `/start-session` and `/project-status` skills; commit subject `feat(T10): add review-nudge resolver with tests`.
(Append dated entries as work progresses)
