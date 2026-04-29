# Todo And Parking Flow

Slug: `docs/agents/todo/` is the single parking lot; `brainstorm-plan`
consults it; incorporated todos are deleted in the same commit as the
new plan.

## Why this shape

We considered three surfaces: `docs/agents/todo/` (many files,
scoped-ish), `docs/agents/ideas.md` (one file, lighter thoughts), and
`docs/agents/design-notes/` (design discussions). In practice the
ideas-vs-todo split forces a classification decision at park time that
is often ambiguous and rarely useful. Collapsing to one surface
(`todo/`, free-form slug-named files, no required shape) pays the
classification cost at scan time inside `brainstorm-plan` instead, and
matches where the friction actually lives.

## Rules

- Any deferred thought goes in `docs/agents/todo/<slug>.md`. No shape
  required — one line is fine, a fully scoped proposal is fine.
- `brainstorm-plan` reviews `docs/agents/todo/` as part of its
  exploration step when proposing new plan scope. It is also free to
  introduce new scope not sourced from any todo.
- When a todo is incorporated into a new active `docs/agents/plan.md`,
  delete the todo file in the same commit as the new plan. `git log
  docs/agents/todo/` and the archived plan together are the audit
  trail.
- Design discussions heavier than a todo but not yet work should go in
  `docs/agents/design-notes/` instead.

## Why not `/feature`

We considered a `/feature` command as a middle step between `/todo`
and `/brainstorm-plan`. The gap it would fill is "pick up a
concrete todo and add it as a phase to the active plan without the
full brainstorm ceremony." That is a narrow behavior, and if it ever
proves painful in practice, the right home is an amend mode of
`brainstorm-plan` — not a new top-level command. Do not ship
`/feature` preemptively.

## Why not a `/todo` command

Parking is a two-line action: write a markdown file, name it with a
slug. A command that wraps that adds more ceremony than it removes.
Keep `todo/` a file-naming convention.
