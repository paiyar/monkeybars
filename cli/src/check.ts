import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { gitStatus, isGitRepository, recentCommits } from "./git.js";
import { displayPath, normalizeTaskId, parsePhaseLabel, readPhaseFile, readStatusFile } from "./markdown.js";
import type { CheckResult, Finding } from "./types.js";

function add(findings: Finding[], finding: Finding): void {
  findings.push(finding);
}

function isLastCommitValid(value: string, cwd: string): boolean {
  if (!value || value === "none") return true;
  const commits = recentCommits(cwd);
  return commits.some((commit) => commit.includes(value) || value.includes(commit));
}

function wipDocumented(wipValue: string | undefined, logText: string, dirty: string[]): boolean {
  if (dirty.length === 0) return true;
  const value = wipValue?.trim() ?? "";
  if (value && value.toLowerCase() !== "none") return true;
  return dirty.some((entry) => {
    const file = entry.slice(3).trim();
    return file && logText.includes(file);
  });
}

export function runCheck(cwd = process.cwd()): CheckResult {
  const findings: Finding[] = [];
  const statusPath = join(cwd, "docs", "status.md");
  const planPath = join(cwd, "docs", "plan.md");

  if (!isGitRepository(cwd)) {
    add(findings, {
      severity: "error",
      code: "not-git-repository",
      message: "Current directory is not inside a git repository."
    });
    return { ok: false, findings };
  }

  if (!existsSync(statusPath)) {
    add(findings, {
      severity: "error",
      code: "missing-status",
      message: "Missing docs/status.md.",
      file: "docs/status.md"
    });
    return { ok: false, findings };
  }

  if (!existsSync(planPath)) {
    add(findings, {
      severity: "error",
      code: "missing-plan",
      message: "Missing active docs/plan.md.",
      file: "docs/plan.md"
    });
  }

  const status = readStatusFile(statusPath);
  const phaseFile = status.active["phase file"];
  if (!phaseFile) {
    add(findings, {
      severity: "error",
      code: "missing-phase-pointer",
      message: "docs/status.md does not define Active Work phase file.",
      file: "docs/status.md"
    });
    return { ok: false, findings, status };
  }

  const phasePath = resolve(cwd, phaseFile);
  if (!existsSync(phasePath)) {
    add(findings, {
      severity: "error",
      code: "missing-phase-file",
      message: `Active phase file does not exist: ${phaseFile}.`,
      file: phaseFile
    });
    return { ok: false, findings, status };
  }

  const phase = readPhaseFile(phasePath);
  const statusPhaseValue = status.active.phase;
  if (!statusPhaseValue) {
    add(findings, {
      severity: "error",
      code: "missing-phase-label",
      message: "docs/status.md does not define Active Work phase.",
      file: "docs/status.md"
    });
  }

  const statusPhase = parsePhaseLabel(statusPhaseValue);
  if (statusPhaseValue && !statusPhase) {
    add(findings, {
      severity: "error",
      code: "invalid-phase-label",
      message: `docs/status.md phase must look like "1 — Title": ${statusPhaseValue}.`,
      file: "docs/status.md"
    });
  }

  const phaseLabel = parsePhaseLabel(phase.title);
  if (!phase.title || !phaseLabel) {
    add(findings, {
      severity: "error",
      code: "invalid-phase-label",
      message: `Active phase file title must look like "# Phase 1 — Title".`,
      file: phaseFile
    });
  }

  if (
    statusPhase &&
    phaseLabel &&
    (statusPhase.number !== phaseLabel.number || statusPhase.title !== phaseLabel.title)
  ) {
    add(findings, {
      severity: "error",
      code: "phase-metadata-mismatch",
      message: `Phase mismatch: docs/status.md says ${statusPhase.number} — ${statusPhase.title}, ${displayPath(phase.path)} says ${phaseLabel.number} — ${phaseLabel.title}.`,
      file: phaseFile
    });
  }

  const statusState = status.active.state;
  const phaseState = phase.status.state;
  if (statusState && phaseState && statusState !== phaseState) {
    add(findings, {
      severity: "error",
      code: "state-mismatch",
      message: `State mismatch: docs/status.md says ${statusState}, ${displayPath(phase.path)} says ${phaseState}.`,
      file: phaseFile
    });
  }

  const statusTask = normalizeTaskId(status.active["current task"]);
  const phaseTask = normalizeTaskId(phase.status["current task"]);
  if (statusTask && phaseTask && statusTask !== phaseTask) {
    add(findings, {
      severity: "error",
      code: "current-task-mismatch",
      message: `Current task mismatch: docs/status.md says ${statusTask}, ${displayPath(phase.path)} says ${phaseTask}.`,
      file: phaseFile
    });
  }

  const currentTask = phaseTask || statusTask;
  const firstUnchecked = phase.tasks.find((task) => !task.checked);
  if (currentTask === "complete") {
    const unchecked = phase.tasks.filter((task) => !task.checked);
    if (unchecked.length > 0) {
      add(findings, {
        severity: "error",
        code: "complete-with-unchecked-tasks",
        message: `Current task is complete but ${unchecked.length} task(s) are unchecked.`,
        file: phaseFile
      });
    }
  } else if (currentTask && firstUnchecked && currentTask !== firstUnchecked.id) {
    add(findings, {
      severity: "error",
      code: "current-task-not-first-unchecked",
      message: `Current task should be first unchecked task ${firstUnchecked.id}, not ${currentTask}.`,
      file: phaseFile
    });
  } else if (currentTask && !firstUnchecked && currentTask !== "complete") {
    add(findings, {
      severity: "error",
      code: "all-tasks-checked",
      message: "All tasks are checked, but current task is not complete.",
      file: phaseFile
    });
  }

  const lastCommit = status.active["last commit"] || phase.status["last commit"];
  if (lastCommit && !isLastCommitValid(lastCommit, cwd)) {
    add(findings, {
      severity: "warning",
      code: "last-commit-not-found",
      message: `Last commit value was not found in recent git log: ${lastCommit}.`,
      file: phaseFile
    });
  }

  const dirty = gitStatus(cwd);
  if (!wipDocumented(phase.status["wip files"], phase.logText, dirty)) {
    add(findings, {
      severity: "warning",
      code: "dirty-worktree-undocumented",
      message: "Worktree has dirty files that are not documented in WIP files or latest log.",
      file: phaseFile
    });
  }

  const hasErrors = findings.some((finding) => finding.severity === "error");
  return { ok: !hasErrors, findings, status, phase };
}

export function printCheckResult(result: CheckResult): void {
  if (result.findings.length === 0) {
    console.log("Agent Workflow check passed.");
    return;
  }

  for (const finding of result.findings) {
    const label = finding.severity === "error" ? "ERROR" : "WARN";
    const file = finding.file ? ` ${finding.file}` : "";
    console.log(`${label} ${finding.code}${file}: ${finding.message}`);
  }
}
