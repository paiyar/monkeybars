import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runCheck } from "../cli/src/check";
import { commitAll, tempDir, tempRepo, writeWorkflow } from "./helpers";

describe("monkeybars check", () => {
  test("passes with matching status and phase files", () => {
    const root = tempRepo();
    writeWorkflow(root);
    commitAll(root);
    const result = runCheck(root);
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  test("fails when docs/status.md is missing", () => {
    const root = tempRepo();
    const result = runCheck(root);
    expect(result.ok).toBe(false);
    expect(result.findings[0]?.code).toBe("missing-status");
  });

  test("fails when docs/plan.md is missing", () => {
    const root = tempRepo();
    mkdirSync(join(root, "docs", "work"), { recursive: true });
    writeFileSync(join(root, "docs", "status.md"), `# Project Status

## Active Work

- **Phase file:** docs/work/phase-1.md
- **Phase:** 1 — Test
- **State:** not_started
- **Current task:** T01 — first task
- **Last commit:** none
`);
    writeFileSync(join(root, "docs", "work", "phase-1.md"), `# Phase 1 — Test

## Status

- **State:** not_started
- **Current task:** T01 — first task
- **Last commit:** none
- **Preflight:** n/a
- **Blockers:** none
- **WIP files:** none

## Tasks

- [ ] T01 — first task | files

## Log
`);

    const result = runCheck(root);
    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.code === "missing-plan")).toBe(true);
  });

  test("fails outside a git repository", () => {
    const root = tempDir();
    writeWorkflow(root);
    const result = runCheck(root);
    expect(result.ok).toBe(false);
    expect(result.findings[0]?.code).toBe("not-git-repository");
  });

  test("fails when status phase metadata does not match active phase file", () => {
    const root = tempRepo();
    writeWorkflow(root, { phase: "2 — Other" });
    commitAll(root);
    const result = runCheck(root);
    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.code === "phase-metadata-mismatch")).toBe(true);
  });

  test("fails when phase metadata is invalid", () => {
    const root = tempRepo();
    writeWorkflow(root, { phaseTitle: "Phase One" });
    commitAll(root);
    const result = runCheck(root);
    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.code === "invalid-phase-label")).toBe(true);
  });

  test("fails when current task is not first unchecked task", () => {
    const root = tempRepo();
    writeWorkflow(root, { current: "T02", phaseCurrent: "T02" });
    const result = runCheck(root);
    expect(result.ok).toBe(false);
    expect(result.findings[0]?.code).toBe("current-task-not-first-unchecked");
  });
});
