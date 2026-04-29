# `/review-work` Should Bail When Filtered Commit List Is Empty

Slug: `/review-work` only refuses to create an artifact when the raw
`git log <base>..HEAD` is empty. It does not also refuse when the
filtered task-commit list is empty, which produces a misleading review
with no commits and silently advances the `reviewed_through:` anchor.

## Context

The skill step 3 (`workflow-src/commands/review-work.md:50-55`) says:

> Run `git log <sha>..HEAD --oneline`. If the output is empty, stop and
> report "No unreviewed commits since `<sha>`." Do not create an empty
> review artifact.
>
> Filter the log to task-shape commits … Merge commits are skipped.

But after filtering, the list can also be empty — e.g. a range that
contains only `chore:`, `docs:`, `refactor:` without a `(TXX)` scope,
or merge commits. The skill body does not cover this case, so step 7
writes an artifact with an empty "Commits reviewed" list and a valid
`reviewed_through:` anchor. That anchor then hides the fact that no
real review happened the next time `/review-work` runs.

Surfaced during T09 dogfood while thinking through what would happen
on a branch that just did release prep (`chore: bump version`,
`docs: update changelog`, no task commits) and then ran `/review-work`.

## Proposed Fix

Add one line to the skill step 3 between the filter step and the
fallback step:

> If the filtered task-commit list is empty (all commits in the range
> were non-task or merge), stop and report "N commits since `<sha>`
> but none match the task-commit shape — nothing to review." Do not
> create a review artifact.

No helper change — `resolveScope` already returns an empty `commits`
array in this situation; the skill body just needs to check for it.

## Pushback To Consider Before Shipping

1. **Is this a real scenario or a theoretical one?** The zero-task
   case was constructed hypothetically. In the repo's actual history
   a release-prep-only range is rare. Low urgency.

2. **Suppressing the empty artifact means no audit trail that the
   range was reviewed.** If someone re-runs `/review-work` on the
   same range, they'll redo the work. Counter-argument: an artifact
   with zero commits isn't much of a trail either, and the log
   output is enough.

3. **Should a pure-docs range be reviewed?** If a range is 100%
   `docs:` commits, arguably the user *should* be able to produce a
   review that says "approve — documentation only." Refusing to
   create the artifact forecloses that option. Counter: `/review-work`
   targets task commits per its description; docs-only review is
   a different use case.

## Open Questions

- Should the skill offer an `--include-non-task` override? Or is
  "rename your commits to use `(TXX)` scope and re-run" the
  expected answer?
- If a range has 5 task commits and 2 non-task commits, the current
  behavior reviews the 5 and ignores the 2. Should the artifact at
  least mention the 2 that were filtered out?

## Acceptance Criteria

- `/review-work` refuses to create an artifact when the filtered
  task-commit list is empty, and reports a reason that distinguishes
  "no commits at all" from "commits exist but none are task commits."
- `workflow-src/commands/review-work.md` is regenerated into the
  adapters.
- Existing tests still pass (no regression on the resolver helper).
