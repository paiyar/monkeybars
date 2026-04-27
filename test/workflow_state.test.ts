import { describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { advanceTask, migrateStatus, summarizeWorkflow } from "../cli/src/workflow-state";
import { readStatusFile } from "../cli/src/markdown";
import { tempDir, writeWorkflow } from "./helpers";

describe("workflow state", () => {
  test("migrateStatus adds structured status block", () => {
    const root = tempDir("monkeybars-state-");
    writeWorkflow(root, { minimalPlan: true, wipFiles: "src/example.ts", planScope: "test", lastUpdated: "2026-01-01" });

    migrateStatus(root);

    const text = readFileSync(join(root, "docs", "status.md"), "utf8");
    expect(text).toContain("<!-- monkeybars:status");
    expect(text).toContain("phase_file: docs/work/phase-1.md");
    expect(readStatusFile(join(root, "docs", "status.md")).active["current task"]).toContain("T01");
  });

  test("structured status block takes precedence over legacy bullets", () => {
    const root = tempDir("monkeybars-state-");
    writeWorkflow(root, {
      minimalPlan: true,
      wipFiles: "src/example.ts",
      planScope: "test",
      lastUpdated: "2026-01-01",
      statusExtra: `<!-- monkeybars:status
phase_file: docs/work/phase-1.md
phase: 1 — Test
state: not_started
current_task: T01 — first task
last_commit: none
-->

`
    });
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
    const root = tempDir("monkeybars-state-");
    writeWorkflow(root, { minimalPlan: true, wipFiles: "src/example.ts", planScope: "test", lastUpdated: "2026-01-01" });

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
