# Architecture

> Last updated: 2026-04-27

## Current Architecture

- `workflow-src/commands/*.md` — canonical skill definitions; frontmatter
  `name` and `description` required.
- `workflow-src/templates/*.md` — templates; some inlined into skills via
  `include_templates`.
- `cli/src/generator.ts` — emits per-tool adapters into `monkeybars/`.
- `cli/src/workflow-state.ts` — reads `docs/status.md`, `docs/plan.md`,
  active `docs/work/phase-N.md`; produces `summarizeWorkflow`,
  `nextRecommendation`, `health`, `advanceTask`, `preflight`,
  `migrateStatus`, `doctor`.
- `cli/src/check.ts` — `runCheck`, strict cross-file invariant check, also
  hard-coded to `docs/`.
- `cli/src/markdown.ts` — small parsers for status, plan, and phase files;
  path-aware in a few places (e.g. the `phase file` key expects
  `docs/work/phase-N.md`).
- `test/` — Bun tests with fixtures rooted at `docs/`.
- CI runs `bun run test` and `bun run generate:check`.

## Target Architecture

Two additive layers plus a path refactor:

1. **Path refactor.** Every workflow file lives under `docs/agents/`. One
   constant change (or a small number of grouped constants) in
   `cli/src/workflow-state.ts`, `cli/src/check.ts`, `cli/src/markdown.ts`,
   and the templates/commands that name paths.
2. **`/review-work` skill.** New `workflow-src/commands/review-work.md`.
   No CLI counterpart — the skill drives the review entirely through
   existing tools (`git log`, `git diff`, file reads).
3. **Nudge steps.** Two new steps inside
   `workflow-src/commands/{start-session,project-status}.md` that read
   `docs/agents/reviews/` and `git log` to surface one line.

## Components

- **Path constants.** Centralize in `cli/src/workflow-state.ts` (or a new
  `cli/src/paths.ts` if the ergonomics push that way) so the cutover is a
  single-file conceptual change even if it touches several files.
- **Review artifact schema.** `docs/agents/reviews/YYYY-MM-DD-<sha>.md`.
  Required frontmatter lines in the body: `**Scope:**`, `**Verdict:**`,
  `**reviewed_through:**`. The last is the durable marker read by the
  nudge and by the next review's auto-scope.
- **Scope resolver (skill instructions).** Skill body reads newest review
  file, extracts `reviewed_through:`, runs `git log <sha>..HEAD --oneline`,
  filters to task-shape commits (regex on subject). If no prior review:
  falls back to branch-base commits or active phase commits.
- **Nudge resolver (skill instructions).** Two skill bodies read newest
  review file and compare `reviewed_through:` to HEAD. Silent when equal
  or when the directory is empty.
- **Parked todos directory.** `docs/agents/todo/`. Free-form
  slug-named markdown files, no required shape — from a one-line
  thought up to a fully-scoped proposal. No CLI reads this directory;
  `brainstorm-plan` consults it as part of its exploration step and
  deletes incorporated todos in the same commit as the new active plan.
  Intentionally a convention, not a command.
- **`brainstorm-plan` PRD-update discipline.** `brainstorm-plan` is
  the only command that edits `docs/agents/prd/spec.md` and
  `docs/agents/prd/architecture.md`, and it edits them only when the
  design shifts — a component is added, removed, renamed, or gains a
  new responsibility. Pure phase reshuffles, re-sequencing, or small
  acceptance-criteria tweaks edit `docs/agents/plan.md` only. This
  keeps PRDs a reliable input to the next `brainstorm-plan` pass
  instead of a thing that drifts with every mid-flight scope
  adjustment.

## Data Flow

Review:
1. User runs `/review-work`.
2. Skill lists `docs/agents/reviews/*.md`, picks newest by filename.
3. Extracts `reviewed_through:` sha (or detects first review).
4. Runs `git log` over the scope, filters task commits.
5. Runs `git diff` over the same range, reads acceptance from active
   phase file.
6. Performs Pass 1 (spec compliance) and Pass 2 (code quality) reads.
7. Writes `docs/agents/reviews/YYYY-MM-DD-<head-sha>.md` with findings.

Nudge:
1. User runs `/start-session` or `/project-status`.
2. Skill reads newest review file's `reviewed_through:`.
3. Counts task-shape commits since that sha on current branch.
4. If count > 0, emits one line; otherwise silent.

## Interfaces

- `/review-work` skill — accepts optional args: `phase-N`, `T0X..T0Y`,
  `<sha>..<sha>`, `last`.
- Review file — human-readable Markdown; machine-readable via the two
  anchor lines (`**reviewed_through:**`, `**Verdict:**`).
- No new CLI subcommands.

## Constraints

- No new runtime dependencies.
- Skill must not mutate workflow state (no edits to status/plan/phase).
- Skill must not commit.
- Nudge must be silent on the zero-unreviewed path.
- Path cutover must be atomic per phase — no repo in a half-migrated
  state at any commit boundary.

## Testing Strategy

- Extend fixtures in `test/` to use `docs/agents/`.
- New Bun tests for:
  - scope auto-detection (no prior review, prior review matches HEAD,
    prior review N commits behind HEAD)
  - nudge output shape (empty reviews dir, up-to-date, behind)
  - merge-commit skip
- Preflight: `bun run test` + `bun run generate:check`.

## Risks

- **Path refactor breadth.** Touches many files; easy to miss one.
  Mitigation: use grep at phase acceptance; tests will fail on any stale
  path that is actually exercised.
- **Skill scope-detection ambiguity.** A merge commit or a non-task
  commit on the active branch could confuse filtering. Mitigation:
  explicit filter on the `type(TXX): ...` shape; unknown commits are
  reported as "untagged commits in range" rather than silently included.
- **Review file overwrite surprise.** Same-day-same-head overwrite could
  destroy prior findings if the user reviewed twice. Mitigation:
  document it; the second review is re-reviewing the same target, which
  is the intended meaning.
- **Nudge noise.** If the filter is too loose, every chore commit
  triggers "unreviewed" spam. Mitigation: filter on task-shape subject
  same as the scope resolver.
