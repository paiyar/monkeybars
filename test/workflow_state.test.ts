import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { advanceTask, migrateStatus, summarizeWorkflow } from "../cli/src/workflow-state";
import { readStatusFile } from "../cli/src/markdown";

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), "monkeybars-state-"));
}

function writeWorkflow(root: string, statusExtra = ""): void {
  mkdirSync(join(root, "docs", "work"), { recursive: true });
  writeFileSync(join(root, "docs", "plan.md"), `# Implementation Plan

## Phase 1 — Test

- **Goal:** Test workflow fixture
`);
  writeFileSync(join(root, "docs", "status.md"), `# Project Status

> Last updated: 2026-01-01

${statusExtra}
## Active Work

- **Plan scope:** test
- **Phase file:** docs/work/phase-1.md
- **Phase:** 1 — Test
- **State:** not_started
- **Current task:** T01 — first task
- **Last commit:** none

## Phase Summary

| Phase | Title | State |
|---|---|---|
| 1 | Test | not_started |
`);
  writeFileSync(join(root, "docs", "work", "phase-1.md"), `# Phase 1 — Test

## Status

- **State:** not_started
- **Current task:** T01 — first task
- **Last commit:** none
- **Preflight:** n/a
- **Blockers:** none
- **WIP files:** src/example.ts

## Tasks

- [ ] T01 — first task | files
- [ ] T02 — second task | files

## Log
`);
}

describe("workflow state", () => {
  test("migrateStatus adds structured status block", () => {
    const root = tempProject();
    writeWorkflow(root);

    migrateStatus(root);

    const text = readFileSync(join(root, "docs", "status.md"), "utf8");
    expect(text).toContain("<!-- monkeybars:status");
    expect(text).toContain("phase_file: docs/work/phase-1.md");
    expect(readStatusFile(join(root, "docs", "status.md")).active["current task"]).toContain("T01");
  });

  test("structured status block takes precedence over legacy bullets", () => {
    const root = tempProject();
    writeWorkflow(root, `<!-- monkeybars:status
phase_file: docs/work/phase-1.md
phase: 1 — Test
state: not_started
current_task: T01 — first task
last_commit: none
-->

`);
    const statusPath = join(root, "docs", "status.md");
    const text = readFileSync(statusPath, "utf8").replace(
      "- **Current task:** T01 — first task",
      "- **Current task:** T02 — stale task"
    );
    writeFileSync(statusPath, text);

    const summary = summarizeWorkflow(root);

    expect(summary.currentTask).toContain("T01");
  });

  test("advanceTask checks off current task and updates tracking files before commit", () => {
    const root = tempProject();
    writeWorkflow(root);

    const result = advanceTask("T01", "feat(T01): finish first task", root);

    expect(result.nextTask).toContain("T02");
    const phase = readFileSync(join(root, "docs", "work", "phase-1.md"), "utf8");
    const status = readFileSync(join(root, "docs", "status.md"), "utf8");
    expect(phase).toContain("- [x] T01");
    expect(phase).toContain("- **Current task:** T02");
    expect(phase).toContain("commit subject `feat(T01): finish first task`");
    expect(status).toContain("<!-- monkeybars:status");
    expect(status).toContain("current_task: T02");
    expect(status).toContain("| 1 | Test | in_progress |");
  });
});
