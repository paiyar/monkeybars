# Product Spec

> Last updated: 2026-04-27

## Problem

MonkeyBars currently jumps from implementation straight to `/complete-task`
without a review step, and dumps all workflow files into an undifferentiated
`docs/` directory alongside human-authored docs. Two gaps:

- No paper trail of what an LLM-driven change was reviewed for. Reviewers and
  future contributors cannot see what the agent (or user) already scrutinized
  before commit.
- Agent-workflow state and human-authored documentation share one directory,
  so readers cannot tell at a glance which files are for them versus for the
  agent loop.

## Current State

- Workflow commands live in `workflow-src/commands/`; generated adapters in
  `monkeybars/`. CLI in `cli/src/`.
- Lifecycle: `/start-session` → implement → `/complete-task` (runs preflight,
  `monkeybars advance`, commits). No review step.
- `cli/src/workflow-state.ts`, `cli/src/check.ts`, `cli/src/markdown.ts`
  hard-code `docs/status.md`, `docs/plan.md`, `docs/work/phase-N.md`,
  `docs/prd/`, and `docs/archive/plans/`.
- `docs/resources/review_template.md` and
  `docs/resources/review_template_2.md` exist as reference material for the
  review work we are about to plan.
- MonkeyBars is only installed in this repo. No consumer compatibility
  concern.

## Target Outcome

- `/review-work` is available in every target agent (Claude / Codex /
  OpenCode). Running it self-identifies the scope (commits since the last
  review, or branch divergence if no prior review), produces a durable review
  file at `docs/agents/reviews/YYYY-MM-DD-<sha>.md`, and returns a verdict.
- `/start-session` and `/project-status` surface a single line when the
  current branch has unreviewed task commits, and say nothing otherwise.
- Every MonkeyBars workflow file lives under `docs/agents/` instead of
  `docs/`. Human docs stay in `docs/` (README, design notes, etc. as
  appropriate).
- `docs/agents/todo/` is the single parking surface for deferred work
  (fully-scoped or half-formed, free-form, no required shape).
  `brainstorm-plan` consults it when proposing new scope, and a todo
  incorporated into a new active plan is deleted in the same commit as
  the new plan.

## Goals

- Add a review step that is user-triggered, self-scoping, and advisory
  (never blocks `/complete-task`, never mutates workflow state).
- Make agent-workflow state visually separate from human-authored docs by
  scoping it under `docs/agents/`.
- Formalize `docs/agents/todo/` as the parking lot and park the `/todo`
  parking-flow discussion itself there. `/feature` is intentionally not
  parked; it collapses into `brainstorm-plan` as an amend mode if the
  need materializes.

## Non-Goals

- No hard review gate. `/review-work` does not block commits or advance.
- No consumer-project migration for the `docs/agents/` move; this change
  only lands in this repo.
- No `monkeybars check` warning for unreviewed commits. The nudge is
  chat-native only.
- No back-compat shim reading `docs/` as a fallback. Cutover is complete.
- Not shipping a `/todo` command; parking stays a file-naming
  convention. `/feature` is out of scope entirely.

## Users And Workflows

- **User:** MonkeyBars maintainer iterating on this repo.
  - **Workflow:** After a task or two, run `/review-work`. Skill reports
    scope, reviews, writes the artifact. Findings inform the next commit or
    a fix. Next `/start-session` or `/project-status` notes when reviews
    drift behind HEAD.

## Requirements

- `/review-work` skill exists for all three targets.
- Skill auto-scopes: reads newest `docs/agents/reviews/*.md`, parses
  `reviewed_through:`, scopes `git log <sha>..HEAD` to task-shaped commit
  subjects. No prior review → scopes commits since branch diverged from
  `main`, or active phase's commits on `main`.
- Override args: `phase-N`, `T0X..T0Y`, `<sha>..<sha>`, `last`.
- Review artifact: `docs/agents/reviews/YYYY-MM-DD-<short-sha>.md` with
  scope range, commit list, verdict, findings (Pass 1 spec compliance +
  Pass 2 code quality), acceptance trace, and `reviewed_through:` marker.
- Same-day-same-head file is overwritten (same review target).
- `/start-session` and `/project-status` emit one line when unreviewed
  task commits exist on the current branch; silent otherwise.
- All MonkeyBars workflow paths move from `docs/` to `docs/agents/` in CLI
  code, workflow source, templates, tests, README, and AGENTS.md.
- Existing `docs/archive/plans/` and `docs/agent-native-workflow-hooks.md`
  migrate into the new tree via `git mv`.
- `docs/agents/todo/` is documented as the parking lot; `brainstorm-plan`
  explicitly consults it and deletes incorporated todos in the same
  commit as the new plan.
- The `/todo` parking-flow discussion is parked at
  `docs/agents/todo/todo-and-parking-flow.md`.

## Acceptance Criteria

- `bun run test` and `bun run generate:check` pass after every phase.
- Running `/review-work` with no args on a fixture repo with 3 unreviewed
  task commits writes one review file whose scope line names those 3
  commits and whose `reviewed_through:` marker matches HEAD.
- Running `/review-work` again immediately produces no file (nothing to
  review).
- Running `/start-session` on a branch with a review that is 4 commits
  behind HEAD emits `Unreviewed: 4 commits since <date>.`; running it
  when review matches HEAD emits nothing about reviews.
- `grep -R 'docs/status.md\|docs/plan.md\|docs/work/\|docs/prd/' cli/ workflow-src/ test/ README.md AGENTS.md`
  returns no hits after Phase 1.
- `docs/agents/todo/todo-and-parking-flow.md` exists (free-form) and
  `AGENTS.md` references `docs/agents/todo/` as the parking lot.
- `workflow-src/commands/brainstorm-plan.md` explicitly consults
  `docs/agents/todo/` in its exploration step and documents the
  delete-on-pickup rule.

## Open Questions

- None block Phase 1. Defer to Phase 2 retrospective: whether scope
  resolution should move from pure skill instructions into a deterministic
  `cli/src/review-scope.ts` helper.
