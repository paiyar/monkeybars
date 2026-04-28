# Implementation Plan

> Source: `docs/agents/prd/spec.md`, `docs/agents/prd/architecture.md`
> Last updated: 2026-04-27

## Plan Scope

Add a review step between implementation and completion, move MonkeyBars
workflow state under `docs/agents/`, and park the `/feature` + `/todo`
design exploration. Dogfooded on this repo only; no consumer migration.

## Plan Lifecycle

This is the active implementation plan. When it is complete, archive it
to `docs/agents/archive/plans/YYYY-MM-DD-review-and-docs-agents.md`, then
write a fresh `docs/agents/plan.md` for the next active scope. Do not
archive or renumber `docs/agents/work/phase-N.md` files. New phases must
use the next available global phase number.

## Phase 1 — Move MonkeyBars docs to `docs/agents/`

- **Goal:** cut every workflow file path from `docs/` to `docs/agents/`
  in one coherent change; repo is fully migrated at the phase boundary.
- **User-visible outcome:** `monkeybars check` / `next` / `health` and
  every workflow command read and write under `docs/agents/`.
- **Deliverables:**
  - Path constants / literals updated in `cli/src/workflow-state.ts`,
    `cli/src/check.ts`, `cli/src/markdown.ts` (and a new `paths.ts` if
    it tidies the touch surface).
  - Every `workflow-src/commands/*.md` and any template referencing
    `docs/` rewritten to `docs/agents/`.
  - README + AGENTS.md path references updated.
  - Existing `docs/archive/plans/` and
    `docs/agent-native-workflow-hooks.md` moved with `git mv` into the
    new tree (archive → `docs/agents/archive/plans/`, design note →
    `docs/agents/design-notes/agent-native-workflow-hooks.md`).
  - Test fixtures and assertions updated to use `docs/agents/`.
- **Likely files/modules:** `cli/src/workflow-state.ts`,
  `cli/src/check.ts`, `cli/src/markdown.ts`,
  `workflow-src/commands/*.md`, `workflow-src/templates/*.md`, `test/`,
  `README.md`, `AGENTS.md`.
- **Dependencies:** none.
- **Acceptance:**
  - `bun run test` passes with every fixture on the new path.
  - `bun run generate:check` passes.
  - `grep -R 'docs/status.md\|docs/plan.md\|docs/work/\|docs/prd/' cli/ workflow-src/ test/ README.md AGENTS.md`
    returns no hits (archived content in `docs/agents/archive/` is
    allowed to retain old paths — it is frozen history).
- **Preflight:** `bun run test`, `bun run generate:check`.
- **Open questions:** whether to introduce `cli/src/paths.ts` or keep
  literals. Decide during Phase 1 T01 based on how many call sites
  actually reuse the same string.

## Phase 2 — Add `/review-work` skill and artifact

- **Goal:** `/review-work` produces a self-contained review file at
  `docs/agents/reviews/YYYY-MM-DD-<sha>.md` with auto-scoped commit
  range, Pass 1/Pass 2 findings, an acceptance trace, and a
  `reviewed_through:` marker.
- **User-visible outcome:** running `/review-work` with no args
  reviews the right commits without scope input; override args
  (`phase-N`, `T0X..T0Y`, `<sha>..<sha>`, `last`) work as described
  in the architecture.
- **Deliverables:**
  - `workflow-src/commands/review-work.md` — skill body merges
    `docs/resources/review_template.md` (Pass 1/Pass 2 rubric,
    verdict vocabulary, finding classification) with the skill
    structure of `docs/resources/review_template_2.md`.
  - Scope resolver as skill instructions (no CLI helper in v1).
  - README + AGENTS.md note describing `/review-work` and when to
    reach for it.
  - Bun test(s) covering scope detection edge cases (no prior
    reviews, prior review at HEAD, prior review N behind HEAD, merge
    commit skip) — skill behavior is tested by running the skill as
    documentation-only; CLI has no new surface, so tests target the
    helper utilities if any emerge.
  - Regenerate adapters into `monkeybars/` and verify
    `generate:check` passes.
- **Likely files/modules:**
  `workflow-src/commands/review-work.md`, `README.md`, `AGENTS.md`,
  `test/` (if helpers are extracted), regenerated `monkeybars/`.
- **Dependencies:** Phase 1.
- **Acceptance:**
  - Skill file exists and is generated into all three adapter trees.
  - Running `/review-work` with no args on a test scenario with 3
    unreviewed task commits produces one file whose scope names
    those commits and whose `reviewed_through:` equals HEAD.
  - Running it again produces no new file when nothing is unreviewed.
  - Override args `phase-1`, `T01..T03`, `abc123..def456`, and `last`
    all resolve to the expected ranges.
  - Dirty worktree is reported, not reviewed.
- **Preflight:** `bun run test`, `bun run generate:check`.
- **Open questions:** whether scope resolution should move into a
  deterministic `cli/src/review-scope.ts` helper. Defer; revisit at
  Phase 2 retrospective based on observed reliability.

## Phase 3 — Passive review nudge in `/start-session` and `/project-status`

- **Goal:** both state commands surface one line when the current
  branch has unreviewed task commits, and say nothing otherwise.
- **User-visible outcome:** running either command after falling
  behind on reviews prints
  `Unreviewed: N commits since YYYY-MM-DD.`
- **Deliverables:**
  - One new step in `workflow-src/commands/start-session.md` and
    `workflow-src/commands/project-status.md`.
  - Regenerate adapters.
  - README + AGENTS.md mention of the nudge.
  - Bun test(s) for the nudge resolver if helpers are extracted.
- **Likely files/modules:**
  `workflow-src/commands/start-session.md`,
  `workflow-src/commands/project-status.md`, `README.md`, `AGENTS.md`,
  regenerated `monkeybars/`.
- **Dependencies:** Phase 2.
- **Acceptance:**
  - Empty `docs/agents/reviews/` → no nudge emitted.
  - Review file with `reviewed_through:` matching HEAD → no nudge.
  - Review file with marker 4 commits behind HEAD → nudge shows
    `Unreviewed: 4 commits since <date>.`
  - `bun run test` and `bun run generate:check` pass.
- **Preflight:** `bun run test`, `bun run generate:check`.
- **Open questions:** none blocking.

## Phase 4 — Park the `/feature` + `/todo` exploration

- **Goal:** preserve the `/feature` + `/todo` design discussion in a
  recoverable form so it is findable next time we brainstorm small-
  work tooling.
- **User-visible outcome:** `docs/agents/ideas.md` exists with a
  single entry; AGENTS.md references it.
- **Deliverables:**
  - `docs/agents/ideas.md` with an h2 entry capturing name, idea,
    why-we-want-it, why-parked, revisit-when.
  - AGENTS.md note pointing at `docs/agents/ideas.md` as the parked-
    ideas file.
- **Likely files/modules:** `docs/agents/ideas.md`, `AGENTS.md`.
- **Dependencies:** Phase 1.
- **Acceptance:**
  - File exists at the expected path with the agreed format.
  - AGENTS.md references it.
  - `bun run test` and `bun run generate:check` pass unchanged.
- **Preflight:** `bun run test`, `bun run generate:check`.
- **Open questions:** none.
