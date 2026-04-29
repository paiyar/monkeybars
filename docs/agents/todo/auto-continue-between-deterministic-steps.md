# Auto-Continue Between Deterministic Workflow Steps

Slug: let MonkeyBars chain deterministic transitions (for example
`complete → create-phase → start-session`) without waiting for the user
to type the next slash command, while keeping a cheap interrupt.

## Context

Working through `docs/agents/plan.md`, the agent keeps landing on "now
run `/create-phase`" or "now run `/start-session`" and stopping until
the user types it. These transitions are deterministic —
`monkeybars next` already computes the right command from repo state —
but nothing wires that output back into the agent's action loop. The
human is a rubber stamp for the happy path.

This should stay compatible with the v1 advisory-hook contract in
`docs/agents/design-notes/agent-native-workflow-hooks.md`: hooks do not
invoke commands or mutate workflow files. The auto-continue surface is
skill-body-driven, not hook-driven.

## Handoff Inventory

From `cli/src/workflow-state.ts` `commandForInitializedWorkflow` and the
command bodies under `workflow-src/commands/`, every transition today:

| Trigger | Next command | Auto-chainable |
|---|---|---|
| not initialized | `initialize-monkeybars` | yes |
| `check` fails | `monkeybars check` (fix) | yes |
| blockers != none | `handoff-session` | yes |
| WIP / dirty files | `start-session` | yes |
| state = complete, more plan phases | `create-phase` | **yes** |
| state = complete, plan exhausted | `brainstorm-plan` | **no** (human scope) |
| current task incomplete | `start-session` | yes |
| after `complete-task` | `context-boundary` → `start-session` | yes (adjacent task) |
| after `create-phase` | review → `start-session` | **yes** |
| after `start-session` | implement | no (agent work) |

## Recommended Long-Term Fix

Extend the existing `monkeybars next` surface with an explicit
"auto-chainable" signal and update the transition-ending skills to
invoke the next skill themselves when the signal is true. No new hook
event, no CLI runner loop.

### 1. Extend `NextRecommendation`

In `cli/src/workflow-state.ts` (the `NextRecommendation` interface and
`commandForInitializedWorkflow`) add:

- `autoContinue: boolean` — true only when the transition is purely
  state-driven: no user input, no destructive action, no planning
  judgment. `brainstorm-plan` stays false.
- `humanGate: string | null` — a one-line reason when `autoContinue` is
  false, surfaced by the skill to the user.

Respect an `MONKEYBARS_AUTO_CONTINUE=off` env var that forces
`autoContinue` to false across the board.

`cli/src/index.ts` `next` subcommand prints the two new fields in the
non-JSON path; JSON already serializes them for free.

### 2. Teach transition-ending skills to chain

Update the final step of:

- `workflow-src/commands/start-session.md` step 10 — if `monkeybars
  next` returns `autoContinue: true` for `create-phase`, invoke
  `/create-phase`.
- `workflow-src/commands/create-phase.md` step 10 — after showing the
  phase file, if `autoContinue: true` for `start-session`, invoke
  `/start-session`.
- `workflow-src/commands/complete-task.md` steps 8-9 — after
  `context-boundary`, if `autoContinue: true` for `start-session`,
  invoke `/start-session`.

Leave `project-status.md` alone — it is explicitly read-only.

Rule baked into every auto-chain step:

> Before invoking, print one line:
> `Auto-continuing: <next-command> — <reason>. Interrupt to stop.`
> Then invoke. The user's next turn boundary is the interrupt point.

### 3. Why not hooks, why not a CLI runner

- v1 hook design forbids hooks from invoking commands or mutating state.
  Changing that is a larger architectural shift than this warrants.
- Hooks run at `SessionStart` / `UserPromptSubmit` — wrong events for
  "after a skill finishes." No `SkillEnd` hook exists today.
- Skill-body instructions are the only surface that works consistently
  across Claude, OpenCode, and Codex.
- A CLI `monkeybars run --auto` loop would have to re-implement most
  skill reasoning in TypeScript. The skills already own the judgment;
  the CLI should keep owning the state read.

## Implementation Notes

- Compute `autoContinue` inside `commandForInitializedWorkflow`
  (`cli/src/workflow-state.ts`). Reuse `runCheck`, `gitStatus`, and
  `readWorkflowSnapshot` that are already threaded through.
- Tests: add Bun cases in `test/` covering `autoContinue` / `humanGate`
  for every row of the handoff inventory, including
  `MONKEYBARS_AUTO_CONTINUE=off`.
- Regenerate adapters (`bun run generate`) and confirm
  `bun run generate:check` stays clean.
- The existing hook context script
  (`workflow-src/hooks/shared/monkeybars-workflow-context.js`) stays as
  is — still the right advisory surface at session start.

## Decisions Captured From Prior Discussion (2026-04-28)

- **Scope:** every deterministic transition where `autoContinue = true`
  in the handoff inventory, including `complete-task → start-session`
  for same-phase adjacent tasks. Not just the two that bit us this
  session.
- **Interrupt UX:** print one line then invoke. No confirmation prompt,
  no sleep. User cancels at the next turn boundary.
- **`brainstorm-plan` stays human-gated.** When the active plan is
  exhausted, `autoContinue` is false. Agent reports `Active plan
  exhausted; run /brainstorm-plan.` and stops. Scope is always a human
  intent decision.

## Plan

1. Finish the current active plan (Phases 2-4 of
   `docs/agents/plan.md`) before picking this up.
2. When that plan is complete, run `/brainstorm-plan` to archive it and
   open a new active `docs/agents/plan.md` whose scope is this document.
3. Split into phases: (a) `NextRecommendation` shape + tests, (b) skill
   body updates + adapter regeneration, (c) dogfood on this repo with
   the next real phase transition.

## Acceptance Criteria

- `monkeybars next` (and its JSON output) exposes `autoContinue` and
  `humanGate` with the values in the handoff-inventory table.
- `MONKEYBARS_AUTO_CONTINUE=off` forces `autoContinue: false`
  everywhere.
- Running `/start-session` on a repo with the active phase complete and
  the next plan phase defined prints a one-line auto-continue notice
  and invokes `/create-phase` without further user input; that run then
  auto-continues into `/start-session` and stops at the first
  implementation step.
- The same chain respects a stop-word in the user's most recent message
  (`pause`, `stop`, `hold on`) and does not chain in that case.
- Running `/start-session` on an exhausted plan reports
  `Active plan exhausted; run /brainstorm-plan.` and stops.
- `bun run test` passes; `bun run generate:check` is clean.
