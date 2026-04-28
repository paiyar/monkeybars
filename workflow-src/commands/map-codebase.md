---
name: map-codebase
description: Document current codebase stack, architecture, testing, and risks before brownfield planning.
opencode_agent: plan
include_templates: current-stack, current-architecture, current-testing, current-risks
---

## When to use

Use before `brainstorm-plan` or `initialize-monkeybars` defines target changes
for an existing codebase. The goal is to capture what is true now so future
planning does not invent architecture, ignore conventions, or miss risks.

## Steps

1. Confirm the current directory is the project root or a git worktree root.
2. Inspect the repository without changing implementation files:
   - dependency manifests and lockfiles
   - top-level directories and entry points
   - configuration files
   - test files and test runner configuration
   - existing docs and agent instructions
   - TODO, FIXME, HACK, and obvious risk markers
3. If the user supplied a path scope, such as `src` or `packages/api`, restrict
   detailed inspection to those paths. Reject path scopes containing `..`,
   absolute paths, or shell metacharacters.
4. Create or update these current-state docs from the bundled templates:
   - `docs/agents/prd/current-stack.md`
   - `docs/agents/prd/current-architecture.md`
   - `docs/agents/prd/current-testing.md`
   - `docs/agents/prd/current-risks.md`
5. Stamp each document with:
   - today's date
   - current `git rev-parse --short HEAD` value, or `none` if unavailable
   - paths inspected
   - concrete file references
   - when the document should be refreshed
6. Keep findings descriptive and current-state only. Do not propose target
   architecture, future phases, or implementation tasks in this command.
7. Show the documents created or updated and recommend `brainstorm-plan` when
   the map is complete.

This command may write only the `docs/agents/prd/current-*.md` files. It must not edit
code, change workflow status, check off tasks, or commit.
