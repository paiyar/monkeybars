import { describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
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
    writeWorkflow(root);
    rmSync(join(root, "docs", "plan.md"));

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
