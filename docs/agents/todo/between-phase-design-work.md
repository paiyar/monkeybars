# Between-Phase Design Work Has No Home

Slug: MonkeyBars skills don't cover design/planning work that happens
between phases — `/complete-task` expects an open TXX, so there's no
clean path for "I edited plans and PRDs mid-session; commit and
continue."

## Context

Observed twice in one session while working on this repo:

1. After Phase 1 completed, we did a Phase 4 rescope conversation
   (discussed `/feature` vs `/todo` vs `ideas.md`, decided on `todo/`
   as the parking lot, edited `plan.md` + `spec.md` +
   `architecture.md`, added parked todos).
2. Later in the same session, decided to fold a PRD-update-discipline
   rule into the same Phase 4 rescope, edited more files.

Both are legitimate work — design decisions that affect the plan and
sometimes the PRDs. Neither is implementation of a task from an active
phase file. Running `/complete-task` on either would fail: step 4
calls `monkeybars advance --task TXX`, but there's no open TXX because
the active phase is `complete` and the next phase hasn't been
materialized.

The user ends up committing manually with plain `docs:` commits, which
works but means the workflow skill surface has a gap.

## Why This Matters

The gap is a real friction point for the MonkeyBars loop:

- `/complete-task` is the obvious command after finishing a chunk of
  work, but it only handles task-shaped chunks.
- `/handoff-session` is about pausing WIP, not about committing
  finished non-task work.
- `/context-boundary` is advisory.
- No command documents "commit planning-doc changes between phases."

Solo dogfood surfaces this fast because the maintainer routinely
iterates on the plan mid-flight. In a more rigid team workflow, phase
boundaries would probably be cleaner and the gap smaller.

## Candidate Fixes

Listed roughly in order of invasiveness:

1. **Do nothing — document the convention.** Add a one-liner to
   `AGENTS.md` or `brainstorm-plan.md`: "Between-phase planning edits
   commit with `docs:` prefix; do not run `/complete-task`." Cheapest
   and honest about the gap.

2. **Broaden `/complete-task`.** Add a branch at the top: if active
   phase state is `complete` (no open TXX), treat the commit as a
   planning commit — skip `monkeybars advance`, still run preflight
   and `monkeybars check`, still invoke `context-boundary` after.
   Keeps one command at the end of any work chunk.

3. **Add a `/commit-planning` skill.** Narrow new skill: run preflight,
   commit with `docs:` prefix, run `monkeybars check`. Explicit, but
   adds surface area.

4. **Mode-split `/complete-task`.** `/complete-task --planning` or
   similar. Same as #2 but opt-in rather than auto-detected.

## Recommendation

Option 2 (broaden `/complete-task`) feels best on first pass: one
command, auto-detected, still enforces the same hygiene (preflight,
check, context-boundary). Worth validating that it doesn't confuse
the state model or invite misuse (e.g. committing what should be a
task commit under the planning branch). If auto-detection is fragile,
fall back to option 1 + a documentation line.

Option 3 is over-engineered for how often this happens.

## Open Questions

- How often does between-phase design work actually happen outside
  solo dogfood? If rare in consumer repos, option 1 is fine.
- Should the broadened `/complete-task` still invoke
  `context-boundary` for planning commits, or skip it since planning
  commits rarely justify a fresh context?
- Does this same gap exist for bug fixes that happen between phases?
  `/fix-bug` exists but follows its own flow; worth checking whether
  it has a matching commit path.

## Acceptance Criteria

- Either the workflow skill surface explicitly handles planning
  commits between phases (option 2/3/4), or `AGENTS.md` /
  `brainstorm-plan.md` documents the `docs:` convention (option 1)
  so future sessions don't re-invent the answer.
- A session that edits `plan.md` or PRDs between phases has a clean,
  discoverable path to commit without running the wrong skill.
