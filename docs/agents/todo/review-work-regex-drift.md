# `/review-work` Skill Body and Helper Regex Disagree on Task-Commit Shape

Slug: the inline regex the skill body describes and the canonical regex
in `cli/src/review-scope.ts` do not agree on whether the `(TXX)` scope
is required. Agents implementing the filter from the skill body will
match commits that the helper correctly rejects.

## Context

`workflow-src/commands/review-work.md:54` describes the task-commit
filter as:

> subject matches `^[a-z]+(\(T\d+\))?: ` with a `(TXX)` scope — e.g.
> `feat(T03): ...`, `fix(T12): ...`

The `?` after the capture group makes the scope optional, so the
regex matches `feat: ...`, `docs: ...`, `chore: ...` — none of which
are task commits. The prose afterward clarifies the intent ("with a
(TXX) scope"), but an agent reading the regex literally will apply
the wrong filter.

The canonical helper at `cli/src/review-scope.ts:28` is:

```ts
const TASK_SUBJECT_RE = /^[a-z]+\(T\d+\):\s/;
```

Scope required, matches the prose intent. Tests at
`test/review-scope.test.ts:24-29` confirm this by rejecting
`chore: materialize phase-2 work file`.

Surfaced during T09 dogfood while sanity-checking that the skill
body and helper agree.

## Proposed Fix

Option A: fix the skill body regex.

> subject matches `^[a-z]+\(T\d+\):\s` (lowercase type, mandatory
> `(TXX)` scope, e.g. `feat(T03): ...`, `fix(T12): ...`). Merge
> commits are skipped.

Option B: delete the inline regex from the skill body and replace
with:

> Filter the log using `filterTaskCommits` from
> `cli/src/review-scope.ts`, which drops merge commits and any
> subject without a `(TXX)` scope. See `test/review-scope.test.ts`
> for the exact shape.

Option B is cleaner — a single source of truth — but requires agents
to either run the helper via a small script or internalize the spec
by reading the tests. Option A is more self-contained.

## Pushback To Consider Before Shipping

1. **Is this actually confusing in practice?** The prose next to the
   regex says "with a `(TXX)` scope" — any careful reader gets the
   intent. The regex-as-written is a hint, not a contract. Low
   severity.

2. **Option B creates a dependency from the skill body to a TS
   module.** Agents running the skill may not have Bun available,
   or may not want to run a script to filter commits. Option A
   keeps the skill self-contained.

3. **Changing `TASK_SUBJECT_RE` to match the inline regex would be
   wrong.** Non-task commits in a range should be filtered out.
   If the helper becomes too lenient, the review artifact starts
   including `chore:` commits again, which defeats the purpose.

## Open Questions

- Should the skill body point at `filterTaskCommits` as the
  canonical implementation (Option B)? Or is prose + a correct
  inline regex (Option A) sufficient?
- If Option B: is there a pattern for skill bodies to reference TS
  helpers that stays robust as the repo evolves?

## Acceptance Criteria

- Skill body and `cli/src/review-scope.ts` agree on the task-commit
  shape, resolved as either Option A (fix the inline regex) or
  Option B (delegate to the helper).
- If Option B is chosen, the skill body explains how an agent
  without Bun on PATH should fall back.
- Adapters regenerate clean.
