---
name: brainstorm-plan
description: Turn rough intent, existing repo state, or next-release goals into approved planning docs.
opencode_agent: plan
include_templates: spec, architecture, data-model, api, plan
---

## When to use

Use before creating or materially revising `docs/agents/plan.md`,
`docs/agents/prd/spec.md`, or `docs/agents/prd/architecture.md`. Also use when
`initialize-monkeybars`, `create-phase`, or `start-session` finds missing,
vague, stale, contradictory, completed, or over-broad planning context. During
initialization, this command may run as guided planning intake when the user is
not bringing enough existing docs. After a completed release, use it to archive
the completed active plan and create the next active plan.

## Steps

1. Explore project context before asking questions:
   - `README.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/`
   - existing specs, architecture notes, plans, and phase files
   - `docs/agents/todo/` — the parking lot for deferred work; each file is a
     free-form markdown note (one line up to a fully-scoped proposal)
     and is a candidate input to the new plan scope
   - top-level source layout, dependency manifests, and likely preflight
     commands
2. Choose the planning mode:
   - **Greenfield intake:** If the project is new, turn rough intent into
     phase-ready spec, architecture, interface, and active plan docs.
   - **Existing-doc synthesis:** If useful docs exist, map them into the
     canonical planning docs and ask only for blocking gaps.
   - **Brownfield synthesis:** If useful code exists without reliable planning
     context, document the current behavior, current architecture, known
     constraints, and preflight reality before defining target changes. Prefer
     `docs/agents/prd/current-*.md` from `map-codebase`; if they are missing or stale,
     run or recommend `map-codebase` before inventing target architecture.
   - **Next-release planning:** If the current active plan is complete,
     superseded, or stale, archive it under
     `docs/agents/archive/plans/YYYY-MM-DD-<scope>.md`, update living docs under
     `docs/agents/prd/`, and write a fresh active `docs/agents/plan.md`.
   - **Guided intake:** If docs are missing or too rough, interview the user to
     define enough product, architecture, data, interface, and preflight
     context for the first implementation phase.
   - Create optional companion docs only when the project needs them, such as
     `docs/agents/prd/data-model.md` for persistent domain data or `docs/agents/prd/api.md`
     for public interfaces, commands, events, or service contracts.
3. Summarize what is known, what is missing, and whether the request is small
   enough for one plan. If it spans independent subsystems, propose a smaller
   first plan instead of refining the whole project at once.
4. Ask one high-impact clarifying question at a time. Prefer concrete choices
   when they help the user answer quickly. Do not ask questions that the repo
   already answers.
5. Once intent is clear, present 2-3 viable approaches with tradeoffs and a
   recommendation.
6. Present the proposed design in readable sections and get user approval before
   writing files. Cover:
   - planning mode and active plan scope
   - current behavior and current architecture for brownfield work
   - product behavior and users
   - target architecture and components
   - data model, storage, migrations, and retention if applicable
   - APIs, commands, events, or other interfaces if applicable
   - data flow and boundaries
   - dependencies and constraints
   - testing and preflight expectations
   - acceptance criteria
7. Create or update planning docs from the bundled templates:
   - `docs/agents/prd/spec.md`
   - `docs/agents/prd/architecture.md`
   - optional: `docs/agents/prd/data-model.md`
   - optional: `docs/agents/prd/api.md`
   - `docs/agents/plan.md`
   If replacing a completed or superseded active plan, archive the old
   `docs/agents/plan.md` before writing the new one. Do not archive or renumber
   `docs/agents/work/phase-N.md` files.

   Apply these two rules when writing or updating the planning docs:
   - **Delete-on-pickup for parked todos.** If a file under
     `docs/agents/todo/` is incorporated into the new active plan, delete
     that todo file in the same commit as the new plan. `git log
     docs/agents/todo/` plus the archived plan together are the audit
     trail. Todos that were read but not picked up stay as-is. New plan
     scope may also come from ideas not sourced from any todo.
   - **PRD-update-only-on-design-shift.** Edit `docs/agents/prd/spec.md`
     and `docs/agents/prd/architecture.md` only when the design shifts —
     a component is added, removed, renamed, or gains a new
     responsibility. For pure phase reshuffles, re-sequencing, or small
     acceptance-criteria tweaks, edit `docs/agents/plan.md` only. This
     keeps the PRDs a reliable input to the next `brainstorm-plan` pass
     instead of drifting with every mid-flight scope adjustment.
8. Run a planning self-review:
   - no placeholders, TODOs, or unresolved contradictions
   - scope is small enough to phase
   - each phase has a clear goal, outcome, deliverables, dependencies,
     acceptance criteria, likely files or modules, and preflight expectations
   - phase numbers in the active plan are greater than existing phase files
     unless this is the first workflow plan in the repo
   - any needed data or interface contracts are explicit enough for Phase 1
   - open questions are explicit and do not block Phase 1 unless they affect
     architecture or acceptance
9. Show the files created or updated, list remaining open questions, and hand
   off to `create-phase` when `docs/agents/plan.md` is phase-ready.

This command may edit planning files only after the user approves the proposed
design. It must not create phase files, check off tasks, run implementation, or
commit work.
