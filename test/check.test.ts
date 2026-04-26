import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runCheck } from "../cli/src/check";
import { installHooks, uninstallHooks } from "../cli/src/hooks";

function tempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "agent-workflow-"));
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  return root;
}

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "agent-workflow-"));
}

function writeWorkflow(root: string, options: {
  current?: string;
  phaseCurrent?: string;
  state?: string;
  phaseState?: string;
  phase?: string;
  phaseTitle?: string;
  tasks?: string;
} = {}): void {
  mkdirSync(join(root, "docs", "work"), { recursive: true });
  writeFileSync(join(root, "docs", "plan.md"), `# Implementation Plan

## Phase 1 — Test

- **Goal:** Test workflow fixture
- **User-visible outcome:** Test
- **Deliverables:**
  - Test task
- **Likely files/modules:** test
- **Dependencies:** none
- **Acceptance criteria:**
  - Test passes
- **Preflight:** bun test
- **Open questions:** none
`);
  const current = options.current ?? "T01";
  const phaseCurrent = options.phaseCurrent ?? current;
  const state = options.state ?? "not_started";
  const phaseState = options.phaseState ?? state;
  const phase = options.phase ?? "1 — Test";
  const phaseTitle = options.phaseTitle ?? "Phase 1 — Test";
  const tasks = options.tasks ?? "- [ ] T01 — first task | files\n- [ ] T02 — second task | files";

  writeFileSync(join(root, "docs", "status.md"), `# Project Status

## Active Work

- **Phase file:** docs/work/phase-1.md
- **Phase:** ${phase}
- **State:** ${state}
- **Current task:** ${current} — first task
- **Last commit:** none

## Phase Summary

| Phase | Title | State |
|---|---|---|
| 1 | Test | ${state} |
`);

  writeFileSync(join(root, "docs", "work", "phase-1.md"), `# ${phaseTitle}

## Status

- **State:** ${phaseState}
- **Current task:** ${phaseCurrent} — first task
- **Last commit:** none
- **Preflight:** n/a
- **Blockers:** none
- **WIP files:** none

## Tasks

${tasks}

## Log
`);
}

function commitAll(root: string): void {
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-m", "test fixture"], { cwd: root, stdio: "ignore" });
}

describe("agent-workflow check", () => {
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

describe("agent-workflow hooks", () => {
  test("install refuses to overwrite user-owned hook", () => {
    const root = tempRepo();
    const hookPath = join(root, ".git", "hooks", "pre-commit");
    writeFileSync(hookPath, "#!/bin/sh\necho user hook\n");

    expect(() => installHooks({ cwd: root, cliPath: "/tmp/agent-workflow.js" })).toThrow(
      /Refusing to overwrite/
    );
  });

  test("uninstall only removes managed hooks", () => {
    const root = tempRepo();
    installHooks({ cwd: root, cliPath: "/tmp/agent-workflow.js" });
    const preCommit = join(root, ".git", "hooks", "pre-commit");
    const hook = readFileSync(preCommit, "utf8");
    expect(hook).toContain("agent-workflow managed hook");
    expect(hook).toContain("exec bun '/tmp/agent-workflow.js' hooks run pre-commit");

    uninstallHooks(root);
    expect(() => readFileSync(preCommit, "utf8")).toThrow();
  });
});
