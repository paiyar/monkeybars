---
name: initialize-agent-workflow
description: Initialize or adopt repo-local agent workflow files in the current project.
include_templates: agents, claude, spec, architecture, data-model, api, plan, status, phase
---

## When to use

Use inside a target project after installing the global plugin. This command is
the opt-in step that creates or updates project-local workflow files for a new
project, an existing repo, or an existing workflow that needs a next active
plan.

## Steps

1. Confirm the current directory is a git repository.
2. Inspect existing project context:
   - `README.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/`
   - top-level code structure and likely tech stack
   - existing preflight or verification commands
3. Run a planning intake and choose the initialization path:
   - **Greenfield path:** If the repo is new or mostly empty, map available
     intent into the canonical planning docs and create the first active plan.
   - **Brownfield adoption path:** If useful code already exists, document the
     current behavior, current architecture, stack conventions, and known
     risks before proposing target changes. Preserve working behavior and
     project-specific constraints instead of replacing them with generic
     template text.
   - **Bring-your-own-docs path:** If existing docs are sufficient, summarize
     the discovered sources and map them into the canonical workflow docs.
     Preserve source-specific decisions instead of replacing them with generic
     template text.
   - **Next-release path:** If workflow files already exist and the active plan
     is complete or stale, summarize current status and run `brainstorm-plan`
     to archive the completed plan and define the next active `docs/plan.md`.
   - **Guided initialization path:** If planning inputs are missing, vague,
     contradictory, stale, or too broad to split into phase tasks, run
     `brainstorm-plan` before creating `docs/plan.md` or
     `docs/work/phase-1.md`.
   - Ask only for blocking details the repo does not already answer. Prefer one
     concrete question at a time.
4. Determine the project preflight checks: the commands that should pass before
   a completed task is committed. Prefer existing project commands from README,
   AGENTS, package scripts, Makefile, Justfile, Taskfile, Cargo, Go, Python, or
   similar stack conventions. Preflight may include linting, static analysis,
   typechecking, tests, build, migrations, or smoke checks.
5. If no command surface exists, offer to create a minimal `Taskfile.yml` shim
   for the discovered stack. Do not require Taskfile when another runner is
   already present.
6. When planning inputs are sufficient, create missing planning structure from
   the bundled templates:
   - `docs/prd/spec.md`
   - `docs/prd/architecture.md`
   - optional companion docs under `docs/prd/`, such as `data-model.md` or
     `api.md`, only when the project needs that detail
   - `docs/plan.md`
7. Create or update `AGENTS.md` with the workflow rules and documented
   preflight checks. Preserve existing project-specific instructions.
8. If the user is using Claude Code, create or update `CLAUDE.md` so it
   references `AGENTS.md`.
9. Create `docs/status.md` from the status template if missing. Set `Plan
   scope` to the active project, adoption, stabilization, or release scope.
10. Create the first missing `docs/work/phase-N.md` from `docs/plan.md` only
    when the phase is phase-ready. Use the next available global phase number;
    do not reuse old phase numbers from completed work.
11. Install project-local command adapters only if the user asks:
   - OpenCode: `.opencode/commands/`
   - Claude Code: `.claude/skills/`
12. Do not install hooks in v1. If hooks are requested later, install them as a
    separate project-local advisory hook pack.
13. Show files created or updated, then run `workflow-check`.

This command may edit project files because initialization is explicit opt-in.
It must not overwrite existing docs or agent instructions without preserving
their project-specific content.
