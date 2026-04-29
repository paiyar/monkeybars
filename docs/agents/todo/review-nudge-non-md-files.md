# Review Nudge Should Filter `docs/agents/reviews/` To `.md` Files

The `/start-session` and `/project-status` nudge step (introduced in
T11, Phase 3) says "newest file in `docs/agents/reviews/`
(lexicographic filename sort)" without constraining to `.md`. A stray
`2026-04-29-12bf0f3.md.bak` sorts *after* the real review file and
gets picked as "newest," which then fails the `reviewed_through:` grep
(because `.bak` files are arbitrary content) or produces garbage.

## Context

Surfaced during T13 dogfood when `sed -i.bak` on the review file for
a HEAD-match simulation left a `.bak` sibling. The nudge step picked
the `.bak` as newest and failed silently — it returned "match=no" on
identical 40-char SHAs because the grep read the wrong file. The
same risk applies to editor swap files (`.swp`, `~`), OS metadata
(`.DS_Store`), and any future tooling that writes non-review files
alongside reviews.

Current skill instruction (lines 41-48 of both generated
`SKILL.md` files):

> Read the newest file in `docs/agents/reviews/` (lexicographic
> filename sort). If none exists, skip.

`cli/src/review-scope.ts` `pickNewestReview` doesn't have this
problem because the helper is fed a `ReviewFile[]` that the caller
has already filtered. But the skill body does the listing itself,
so the constraint has to live in the skill instruction.

## Proposed Fix

Change the instruction in both `workflow-src/commands/start-session.md`
and `workflow-src/commands/project-status.md` from:

> Read the newest file in `docs/agents/reviews/` (lexicographic
> filename sort).

to:

> Read the newest `*.md` file in `docs/agents/reviews/`
> (lexicographic filename sort, ignoring files whose names do not end
> in `.md`).

Regenerate adapters. No code change — `cli/src/review-nudge.ts` and
`cli/src/review-scope.ts` already take typed `ReviewFile[]`, so the
filtering responsibility is already at the I/O boundary (the skill).

## Pushback To Consider Before Shipping

1. **Is this a real scenario?** The `.bak` file was created by my own
   `sed` during dogfood, not by the workflow itself. A normal user
   running `/review-work` never produces non-`.md` files in this
   directory. So the risk is "an external tool dropped a sibling,"
   which is low but nonzero.

2. **Should the helper guard this instead?** No — the helper is
   already fed a typed list. Asking the helper to validate filenames
   would push an I/O concern (filesystem listing conventions) into a
   pure function.

3. **Is there a cheaper fix?** Yes — document that
   `docs/agents/reviews/` is exclusively `.md`, and leave the skill
   instruction alone. But that relies on agents never producing sibling
   files, which the dogfood just disproved.

## Open Questions

- Should the review-scope resolver (used by `/review-work` itself)
  also get this `.md` filter in its skill instruction? It already
  looks for a prior review, so a `.bak` contaminant there would cause
  an equivalent failure. Worth fixing in the same edit if so.

## Acceptance Criteria

- `/start-session` and `/project-status` nudge steps explicitly
  filter to `*.md` files.
- `/review-work` scope-resolution step also filters to `*.md` if the
  same risk applies.
- Adapters are regenerated.
- No helper code changes.
