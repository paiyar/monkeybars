# Phase 2 — Add `/review-work` skill and artifact

> Source: active docs/agents/plan.md, Phase 2

## Goal

`/review-work` produces a self-contained review file at
`docs/agents/reviews/YYYY-MM-DD-<sha>.md` with auto-scoped commit range,
Pass 1/Pass 2 findings, an acceptance trace, and a `reviewed_through:`
marker.

## Acceptance

- Skill file exists at `workflow-src/commands/review-work.md` and is
  generated into all three adapter trees (`monkeybars/skills/review-work/SKILL.md`,
  `monkeybars/commands/review-work.md`, plus the Codex plugin copy).
- Running `/review-work` with no args on a scenario with 3 unreviewed
  task commits produces one file whose scope names those commits and
  whose `reviewed_through:` equals HEAD.
- Running it again produces no new file when nothing is unreviewed.
- Override args `phase-N`, `T0X..T0Y`, `<sha>..<sha>`, and `last` all
  resolve to the expected ranges.
- Dirty worktree is reported, not reviewed.
- README and AGENTS.md document the skill and when to reach for it.
- `bun run test` and `bun run generate:check` pass.

## Status

- **State:** in_progress
- **Current task:** T07 — Bun tests for scope detection edge cases
- **Last commit:** feat(T06): add /review-work skill with scope resolver and artifact schema
- **Preflight:** n/a
- **Blockers:** none
- **WIP files:** none

## Tasks

- [x] T06 — Create `/review-work` skill body | files: `workflow-src/commands/review-work.md` (new), regenerated `monkeybars/skills/review-work/SKILL.md`, `monkeybars/commands/review-work.md`, Codex plugin copy | verify: `bun run test`, `bun run generate:check`
  - Acceptance: Skill body merges the Pass 1/Pass 2 rubric, verdict vocabulary, and finding classification from `docs/resources/review_template.md` with the skill structure of `docs/resources/review_template_2.md`. Skill body includes scope resolver instructions (read newest `docs/agents/reviews/*.md`, extract `reviewed_through:`, run `git log <sha>..HEAD --oneline`, filter to task-shape commits; no prior review falls back to branch-base or active-phase commits); override-arg handling for `phase-N`, `T0X..T0Y`, `<sha>..<sha>`, `last`; artifact schema (`docs/agents/reviews/YYYY-MM-DD-<short-sha>.md` with `**Scope:**`, `**Verdict:**`, `**reviewed_through:**` anchor lines); dirty-worktree short-circuit ("report, do not review"); merge-commit skip; same-day-same-head overwrite semantics. Skill has no CLI counterpart; must not mutate status/plan/phase and must not commit. Adapters regenerate clean via `bun run generate` and `bun run generate:check` passes.
- [ ] T07 — Bun tests for scope detection edge cases | files: `test/review-scope.test.ts` (new or folded into existing harness), `test/fixtures/` (new fixtures as needed) | verify: `bun run test`
  - Acceptance: Tests cover four scenarios: (a) no prior review file → falls back to branch-base or active-phase range, (b) prior review's `reviewed_through:` equals HEAD → zero commits in scope, (c) prior review N commits behind HEAD → exactly those N commits in scope, (d) range contains a merge commit → merge commit is skipped. If a deterministic helper emerges naturally from T06 it lives at `cli/src/review-scope.ts` and tests target it directly; otherwise tests exercise the scope-resolution logic via a small fixture-driven harness that consumes a fake git log and a fake reviews directory. `bun run test` passes with 4+ new cases.
- [ ] T08 — Document `/review-work` in README and AGENTS.md | files: `README.md`, `AGENTS.md`, regenerated `monkeybars/` if either file is included in an adapter | verify: `bun run test`, `bun run generate:check`
  - Acceptance: `README.md` adds a short section describing `/review-work`: what it does, when to reach for it, and the one-line sample invocation. `AGENTS.md` adds a matching entry in the workflow-command list so agents discover it through the canonical guide. No other behavior changes. `bun run generate:check` passes (no stale adapters).
- [ ] T09 — Dogfood `/review-work` on this repo | files: `docs/agents/reviews/<YYYY-MM-DD>-<sha>.md` (new, the actual review artifact), possibly new entries under `docs/agents/todo/` | verify: manual smoke
  - Acceptance: Run `/review-work` with no args against the current branch state. The skill produces one review file at `docs/agents/reviews/YYYY-MM-DD-<sha>.md` covering whatever unreviewed task commits exist at dogfood time. Findings are recorded (or "no findings" is explicit). Any skill-body rough edges discovered during dogfood are captured as parked todos under `docs/agents/todo/` — they are not fixed inline here (that would be scope creep for this task). If the dogfood surfaces a blocker in the skill itself, stop and return to T06 instead of committing the review file.

## Coverage

| Plan item | Task | Status |
|---|---|---|
| Goal: self-contained review file at `docs/agents/reviews/YYYY-MM-DD-<sha>.md` | T06 | covered |
| Deliverable: `workflow-src/commands/review-work.md` skill body (rubric + structure) | T06 | covered |
| Deliverable: scope resolver as skill instructions | T06 | covered |
| Deliverable: README + AGENTS.md note | T08 | covered |
| Deliverable: Bun tests for scope detection edge cases | T07 | covered |
| Deliverable: regenerated adapters under `monkeybars/` | T06, T08 | covered |
| Acceptance: skill exists and generates into all three adapter trees | T06 | covered |
| Acceptance: no-args review of 3 unreviewed task commits produces one correctly-scoped file | T06, T09 | covered |
| Acceptance: second run produces no new file when nothing is unreviewed | T07 | covered |
| Acceptance: override args `phase-N`, `T0X..T0Y`, `<sha>..<sha>`, `last` resolve correctly | T06, T07 | covered |
| Acceptance: dirty worktree is reported, not reviewed | T06 | covered |
| Acceptance: `bun run test` passes | T06, T07, T08 | covered |
| Acceptance: `bun run generate:check` passes | T06, T08 | covered |

## Log

- 2026-04-29: Completed T06; next task T07 — Bun tests for scope detection edge cases; commit subject `feat(T06): add /review-work skill with scope resolver and artifact schema`.
(Append dated entries as work progresses)
