import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { commitAll, repoRoot, runCli, tempDir, tempRepo, writeWorkflow } from "./helpers";

describe("monkeybars CLI", () => {
  test("check --json emits JSON", () => {
    const root = tempRepo();
    writeWorkflow(root);
    commitAll(root);

    const result = runCli(["check", "--json"], root);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).ok).toBe(true);
  });

  test("status --json emits workflow summary", () => {
    const root = tempRepo();
    writeWorkflow(root, { tasks: "- [ ] T01 — first task | files" });
    commitAll(root);

    const result = runCli(["status", "--json"], root);

    expect(result.status).toBe(0);
    const summary = JSON.parse(result.stdout);
    expect(summary.initialized).toBe(true);
    expect(summary.currentTask).toContain("T01");
    expect(summary.remainingTasks).toBe(1);
  });

  test("next --json recommends the next workflow action", () => {
    const root = tempRepo();
    writeWorkflow(root, { tasks: "- [ ] T01 — first task | files: src/a.ts | verify: bun test" });
    commitAll(root);

    const result = runCli(["next", "--json"], root);

    expect(result.status).toBe(0);
    const recommendation = JSON.parse(result.stdout);
    expect(recommendation.command).toBe("start-session");
    expect(recommendation.reason).toContain("incomplete current task");
    expect(recommendation.currentTask).toContain("T01");
  });

  test("health --json reports structural warnings without failing", () => {
    const root = tempRepo();
    writeWorkflow(root);
    commitAll(root);

    const result = runCli(["health", "--json"], root);

    expect(result.status).toBe(0);
    const health = JSON.parse(result.stdout);
    expect(health.ok).toBe(true);
    expect(health.findings.some((finding: any) => finding.code === "missing-structured-status")).toBe(true);
    expect(health.findings.some((finding: any) => finding.code === "missing-agents")).toBe(true);
  });

  test("health --repair adds structured status metadata", () => {
    const root = tempRepo();
    writeWorkflow(root);
    commitAll(root);

    const result = runCli(["health", "--repair"], root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("REPAIR Added structured status block");
    expect(readFileSync(join(root, "docs", "agents", "status.md"), "utf8")).toContain("<!-- monkeybars:status");
  });

  test("health --repair does not create workflow files outside an initialized git workflow", () => {
    const root = tempDir();

    const result = runCli(["health", "--repair", "--json"], root);

    expect(result.status).toBe(1);
    const health = JSON.parse(result.stdout);
    expect(health.repairs).toEqual([]);
    expect(existsSync(join(root, "docs", "agents", "work"))).toBe(false);
  });

  test("health reports a plan with no parseable phases", () => {
    const root = tempRepo();
    writeWorkflow(root);
    writeFileSync(join(root, "docs", "agents", "plan.md"), "# Implementation Plan\n\nNo phase headings yet.\n");

    const result = runCli(["health", "--json"], root);

    expect(result.status).toBe(1);
    const health = JSON.parse(result.stdout);
    expect(health.findings.some((finding: any) => finding.code === "plan-has-no-phases")).toBe(true);
  });

  test("health reports literal command placeholders in task verification hints", () => {
    const root = tempRepo();
    writeWorkflow(root, { tasks: "- [ ] T01 — first task | files: src/a.ts | verify: [command]" });

    const result = runCli(["health", "--json"], root);

    expect(result.status).toBe(0);
    const health = JSON.parse(result.stdout);
    expect(health.findings.some((finding: any) => finding.code === "task-has-placeholder")).toBe(true);
  });

  test("preflight --dry-run prints AGENTS commands", () => {
    const root = tempRepo();
    writeWorkflow(root);
    writeFileSync(join(root, "AGENTS.md"), `# Agents

## Preflight Checks

\`\`\`sh
bun test
npm run lint
\`\`\`
`);

    const result = runCli(["preflight", "--dry-run"], root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("bun test");
    expect(result.stdout).toContain("npm run lint");
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

describe("monkeybars advance", () => {
  test("advances a task and updates tracking files", () => {
    const root = tempRepo();
    writeWorkflow(root);
    commitAll(root);

    const result = runCli(["advance", "--task", "T01", "--commit", "feat: first task"], root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Advanced");
    expect(result.stdout).toContain("T01");
    const phase = readFileSync(join(root, "docs", "agents", "work", "phase-1.md"), "utf8");
    expect(phase).toContain("- [x] T01");
    expect(phase).toContain("- **Current task:** T02");
  });

  test("fails when --task is missing", () => {
    const result = runCli(["advance", "--commit", "something"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("required");
  });

  test("fails when --commit is missing", () => {
    const result = runCli(["advance", "--task", "T01"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("required");
  });

  test("fails when task ID does not match current task", () => {
    const root = tempRepo();
    writeWorkflow(root);
    commitAll(root);

    const result = runCli(["advance", "--task", "T99", "--commit", "wrong task"], root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("T99");
  });
});

describe("monkeybars migrate-status", () => {
  test("adds structured status block", () => {
    const root = tempDir();
    writeWorkflow(root, { minimalPlan: true });

    const result = runCli(["migrate-status"], root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Migrated");
    const status = readFileSync(join(root, "docs", "agents", "status.md"), "utf8");
    expect(status).toContain("<!-- monkeybars:status");
  });

  test("rejects unknown options", () => {
    const result = runCli(["migrate-status", "--force"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown option");
  });
});

describe("monkeybars doctor", () => {
  test("prints diagnostics for a repo with workflow", () => {
    const root = tempRepo();
    writeWorkflow(root);
    commitAll(root);

    const result = runCli(["doctor"], root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Node:");
    expect(result.stdout).toContain("Git:");
    expect(result.stdout).toContain("Git repository: yes");
    expect(result.stdout).toContain("docs/agents/status.md: present");
  });

  test("works on a bare repo without workflow files", () => {
    const root = tempRepo();

    const result = runCli(["doctor"], root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("docs/agents/status.md: missing");
  });

  test("rejects unknown options", () => {
    const result = runCli(["doctor", "--verbose"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown option");
  });
});

describe("monkeybars generate", () => {
  test("generate --check passes when adapters are fresh", () => {
    const result = runCli(["generate", "--check"], repoRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("up to date");
  });

  test("rejects unknown options", () => {
    const result = runCli(["generate", "--force"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown option");
  });
});
