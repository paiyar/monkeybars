import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cliPath = resolve("dist", "index.js");

function tempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "monkeybars-cli-"));
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  return root;
}

function writeWorkflow(root: string): void {
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
  writeFileSync(join(root, "docs", "status.md"), `# Project Status

## Active Work

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
- **WIP files:** none

## Tasks

- [ ] T01 — first task | files

## Log
`);
}

function commitAll(root: string): void {
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-m", "test fixture"], { cwd: root, stdio: "ignore" });
}

function runCli(args: string[], cwd = process.cwd()) {
  return spawnSync("bun", [cliPath, ...args], {
    cwd,
    encoding: "utf8"
  });
}

describe("monkeybars CLI", () => {
  test("check --json emits JSON", () => {
    const root = tempRepo();
    writeWorkflow(root);
    commitAll(root);

    const result = runCli(["check", "--json"], root);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).ok).toBe(true);
  });

  test("check --bad-option fails as a usage error", () => {
    const result = runCli(["check", "--bad-option"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown option");
  });

  test("hooks command is no longer supported", () => {
    const result = runCli(["hooks", "install"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown command");
  });
});
