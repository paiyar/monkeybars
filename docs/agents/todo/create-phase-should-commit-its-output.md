# `/create-phase` Should Commit Its Own Output

Slug: `/create-phase` writes a new phase file and updates `status.md`
but doesn't close its own loop by committing — the user is left with a
dirty worktree and has to run a commit manually every time.

## Context

The `/create-phase` skill produces two deterministic file changes:

- `docs/agents/work/phase-N.md` (new)
- `docs/agents/status.md` (repointed at Phase N, current task TXX)

After step 10 ("show the created phase file for review"), the skill
stops. The user commits the two files manually with something like
`chore: materialize phase-N work file`.

This prompt gets made every time a phase boundary is crossed. Observed
twice in one session while materializing Phase 2 on this repo.

`/complete-task` already has the symmetric behavior — it commits its
own state updates as part of the task commit (step 6). `/create-phase`
is an outlier.

## Proposed Fix

Add a final step to `workflow-src/commands/create-phase.md` after the
current step 10:

> 11. After the user approves the created phase file, commit
>     `docs/agents/work/phase-N.md` and `docs/agents/status.md` with
>     subject `chore: materialize phase-N work file (TXX-TYY for
>     <phase-title>)`. Do not commit any other worktree changes.

No CLI change. No generator change. Skill-body only.

## Pushback To Consider Before Shipping

Reasons this might *not* be a good idea — worth weighing before
incorporating into a plan:

1. **Auto-commits are a different category than auto-invokes.** This
   todo sits near `auto-continue-between-deterministic-steps.md`, but
   autoContinue chains *skills* — the user still reviews and commits.
   Auto-committing from inside a skill means the skill writes git
   history without per-commit approval. That's a larger blast radius.

2. **Self-check is harder than it looks.** While materializing Phase 2
   on this repo, `/create-phase` first produced a `status.md` with a
   backtick-stripped title (`2 — Add /review-work...` instead of
   `` 2 — Add `/review-work`... ``). `monkeybars check` caught it
   pre-commit; the user fixed it and moved on. If the skill had
   auto-committed step 10's output, the typo would be locked in git
   history, needing an `--amend` or a follow-up commit. Mitigation
   would be to require `monkeybars check` to pass before committing,
   which roughly doubles the flow.

3. **Asymmetry with sibling commands.** `/create-phase` output is
   deterministic (parsed from `plan.md` via a template). But
   `/brainstorm-plan` output is not — it writes PRDs and `plan.md`
   after a user-approved design conversation. A single "skills
   commit their own output" rule would need per-skill exceptions
   (auto-commit OK, manual-commit required) and the line between
   them isn't crisp. Cleaner rule: only commands whose output is
   purely a mechanical derivation of existing state auto-commit.
   That covers `/create-phase` and excludes `/brainstorm-plan`, but
   writing the rule down in a way a skill can follow is more words
   than just "run a commit."

4. **Rollback friction.** The user caught the backtick typo because
   they edited before commit. With auto-commit, the same fix is an
   amend (or a second commit). Low cost in a solo repo; potentially
   higher in a repo where amend-after-push is discouraged.

5. **autoContinue makes this redundant.** If autoContinue ships
   (see `auto-continue-between-deterministic-steps.md`), the chain
   `create-phase → start-session` fires automatically anyway. At
   that point, does "commit on exit" buy anything over "commit at
   the next natural boundary"? Maybe not, if the next boundary is
   milliseconds away. Though: autoContinue doesn't address the
   dirty-worktree state in between, which would then leak into
   `/start-session`'s view of things.

## Open Questions

- If `/create-phase` commits, should it also run
  `monkeybars check` and refuse to commit on findings? (Mitigates
  pushback #2 but doubles flow.)
- Should the rule be "auto-commit only when output is purely
  mechanical," and if so, which commands qualify?
  (`/create-phase` yes; `/brainstorm-plan` no; `/complete-task`
  already does; everything else unclear.)
- Does this change if autoContinue ships first? (Pushback #5.)
- Should the skill commit even if the user edited the file between
  steps 10 and 11? (Edits in that window are legitimate — e.g.,
  fixing a typo — but the skill has no clean way to detect
  "the user is done editing.")

## Acceptance Criteria

- `/create-phase` commits its own output (or explicitly rejects this
  approach after weighing the pushback above). Either outcome is a
  valid resolution of this todo.
- If committing: `monkeybars check` runs before the commit and blocks
  on findings; commit subject includes the task range and phase title;
  only the two deterministic files are staged.
- If rejecting: `workflow-src/commands/create-phase.md` documents why
  the skill intentionally stops before committing, so future
  contributors don't re-propose the same change.
