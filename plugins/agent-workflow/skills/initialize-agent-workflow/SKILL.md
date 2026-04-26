---
name: initialize-agent-workflow
description: Initialize repo-local agent workflow files in the current project.
disable-model-invocation: true
---

## When to use

Use inside a target project after installing the global plugin. This command is
the opt-in step that creates or updates project-local workflow files.

## Steps

1. Confirm the current directory is a git repository.
2. Inspect existing project context:
   - `README.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/`
   - top-level code structure and likely tech stack
   - existing task runner commands
3. If no task runner exists, create a minimal `Taskfile.yml` shim with
   `lint`, `typecheck`, and `test` targets mapped to the project stack, or
   placeholder commands if the project has no tests yet.
4. Create missing planning structure:
   - `docs/prd/spec.md`
   - `docs/prd/architecture.md`
   - `docs/plan.md`
5. Create or update `AGENTS.md` with the workflow rules and project command
   surface. Preserve existing project-specific instructions.
6. If the user is using Claude Code, create or update `CLAUDE.md` so it
   references `AGENTS.md`.
7. Create `docs/status.md` from the status template if missing.
8. Create `docs/work/phase-1.md` from Phase 1 of `docs/plan.md` if missing.
9. Install project-local command adapters only if the user asks:
   - OpenCode: `.opencode/commands/`
   - Claude Code: `.claude/skills/`
10. Do not install hooks in v1. If hooks are requested later, install them as a
    separate project-local advisory hook pack.
11. Show files created or updated, then run `workflow-check`.

This command may edit project files because initialization is explicit opt-in.
It must not overwrite existing docs or agent instructions without preserving
their project-specific content.
