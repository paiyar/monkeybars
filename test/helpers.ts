import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// ── Constants ──────────────────────────────────────────────

/** Absolute path to the built CLI entrypoint. */
export const cliPath = resolve("dist", "index.js");

/** Absolute path to the repository root. */
export const repoRoot = resolve(import.meta.dir, "..");

// ── Temp directory helpers ─────────────────────────────────

/** Create a plain temp directory. */
export function tempDir(prefix = "monkeybars-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Create a temp directory and `git init` it. */
export function tempRepo(prefix = "monkeybars-"): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  return root;
}

// ── Git helpers ────────────────────────────────────────────

/** Stage everything and commit with a test fixture message. */
export function commitAll(root: string, message = "test fixture"): void {
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-m", message], { cwd: root, stdio: "ignore" });
}

// ── CLI runner ─────────────────────────────────────────────

/** Spawn the built CLI with the given args and return the result. */
export function runCli(args: string[], cwd = process.cwd()) {
  return spawnSync("node", [cliPath, ...args], {
    cwd,
    encoding: "utf8"
  });
}

// ── Workflow fixture writer ────────────────────────────────

export interface WriteWorkflowOptions {
  /** Current task id in status.md (default "T01") */
  current?: string;
  /** Current task id in phase file (default same as `current`) */
  phaseCurrent?: string;
  /** State in status.md (default "not_started") */
  state?: string;
  /** State in phase file (default same as `state`) */
  phaseState?: string;
  /** Phase label in status.md (default "1 — Test") */
  phase?: string;
  /** H1 title in phase file (default "Phase 1 — Test") */
  phaseTitle?: string;
  /** Task checklist in phase file */
  tasks?: string;
  /** Extra content inserted before ## Active Work in status.md */
  statusExtra?: string;
  /** Plan scope value in status.md (omit to skip the line) */
  planScope?: string;
  /** Use a minimal plan.md (single line) vs full plan */
  minimalPlan?: boolean;
  /** WIP files value in phase file (default "none") */
  wipFiles?: string;
  /** Include "> Last updated" line in status.md */
  lastUpdated?: string;
}

/**
 * Write a complete workflow fixture (plan.md, status.md, phase-1.md).
 * Consolidates variants previously scattered across test files.
 */
export function writeWorkflow(root: string, options: WriteWorkflowOptions = {}): void {
  mkdirSync(join(root, "docs", "agents", "work"), { recursive: true });

  const current = options.current ?? "T01";
  const phaseCurrent = options.phaseCurrent ?? current;
  const state = options.state ?? "not_started";
  const phaseState = options.phaseState ?? state;
  const phase = options.phase ?? "1 — Test";
  const phaseTitle = options.phaseTitle ?? "Phase 1 — Test";
  const tasks = options.tasks ?? "- [ ] T01 — first task | files\n- [ ] T02 — second task | files";
  const statusExtra = options.statusExtra ?? "";
  const planScope = options.planScope ? `- **Plan scope:** ${options.planScope}\n` : "";
  const wipFiles = options.wipFiles ?? "none";
  const lastUpdatedLine = options.lastUpdated ? `> Last updated: ${options.lastUpdated}\n\n` : "";

  // plan.md
  if (options.minimalPlan) {
    writeFileSync(join(root, "docs", "agents", "plan.md"), `# Implementation Plan

## Phase 1 — Test

- **Goal:** Test workflow fixture
`);
  } else {
    writeFileSync(join(root, "docs", "agents", "plan.md"), `# Implementation Plan

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
  }

  // status.md
  writeFileSync(join(root, "docs", "agents", "status.md"), `# Project Status

${lastUpdatedLine}${statusExtra}## Active Work

${planScope}- **Phase file:** docs/agents/work/phase-1.md
- **Phase:** ${phase}
- **State:** ${state}
- **Current task:** ${current} — first task
- **Last commit:** none

## Phase Summary

| Phase | Title | State |
|---|---|---|
| 1 | Test | ${state} |
`);

  // phase-1.md
  writeFileSync(join(root, "docs", "agents", "work", "phase-1.md"), `# ${phaseTitle}

## Status

- **State:** ${phaseState}
- **Current task:** ${phaseCurrent} — first task
- **Last commit:** none
- **Preflight:** n/a
- **Blockers:** none
- **WIP files:** ${wipFiles}

## Tasks

${tasks}

## Log
`);
}

// ── File reading helpers ───────────────────────────────────

/** Read a file relative to the repo root. */
export function sourceText(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

/** Parse a JSON file by absolute path. */
export function readJson(absolutePath: string): any {
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}
