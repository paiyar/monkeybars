import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runCheck } from "./check.js";
import { checkGeneratedAdapters } from "./generator.js";
import { gitStatus, gitVersion, isGitAvailable, isGitRepository, recentCommitSubjects } from "./git.js";
import {
  displayPath,
  extractPreflightCommands,
  normalizeTaskId,
  parsePhaseLabel,
  readPhaseFile,
  readPlanPhases,
  readStatusFile,
  upsertStructuredStatusFields
} from "./markdown.js";
import { PLAN_FILE, STATUS_FILE, WORK_DIR } from "./paths.js";
import type { Finding, PhaseFile, PhaseTask, PlanPhase, StatusFile } from "./types.js";

export interface WorkflowSnapshot {
  cwd: string;
  statusPath: string;
  planPath: string;
  phasePath?: string;
  status?: StatusFile;
  phase?: PhaseFile;
  planPhases: PlanPhase[];
}

export interface StatusSummary {
  initialized: boolean;
  phase?: string;
  phaseFile?: string;
  state?: string;
  currentTask?: string;
  lastCommit?: string;
  completedTasks: number;
  remainingTasks: number;
  blockers?: string;
  wipFiles?: string;
}

export interface AdvanceResult {
  phaseFile: string;
  completedTask: string;
  nextTask: string;
  state: string;
  commit: string;
}

export interface PreflightResult {
  commands: string[];
  ok: boolean;
  dryRun: boolean;
  failedCommand?: string;
  status?: number | null;
}

export interface NextRecommendation {
  initialized: boolean;
  command: string;
  reason: string;
  phase?: string;
  phaseFile?: string;
  state?: string;
  currentTask?: string;
  blockers?: string;
  wipFiles?: string;
  dirtyFiles: number;
  checkOk?: boolean;
}

export interface HealthFinding extends Finding {
  repairable?: boolean;
}

export interface HealthResult {
  ok: boolean;
  repaired: boolean;
  findings: HealthFinding[];
  repairs: string[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function phaseDisplay(number: string, title: string): string {
  return `${number} \u2014 ${title}`;
}

function taskDisplay(task: PhaseTask | undefined): string {
  if (!task) return "complete";
  const description = task.text.split("|")[0]?.trim() || task.text;
  return `${task.id} \u2014 ${description}`;
}

export function readWorkflowSnapshot(cwd = process.cwd()): WorkflowSnapshot {
  const root = resolve(cwd);
  const statusPath = join(root, STATUS_FILE);
  const planPath = join(root, PLAN_FILE);
  const status = existsSync(statusPath) ? readStatusFile(statusPath) : undefined;
  const planPhases = existsSync(planPath) ? readPlanPhases(planPath) : [];
  const phaseFile = status?.active["phase file"];
  const phasePath = phaseFile ? resolve(root, phaseFile) : undefined;
  const phase = phasePath && existsSync(phasePath) ? readPhaseFile(phasePath) : undefined;

  return {
    cwd: root,
    statusPath,
    planPath,
    phasePath,
    status,
    phase,
    planPhases
  };
}

export function summarizeWorkflow(cwd = process.cwd()): StatusSummary {
  const snapshot = readWorkflowSnapshot(cwd);
  if (!snapshot.status) {
    return {
      initialized: false,
      completedTasks: 0,
      remainingTasks: 0
    };
  }

  const active = snapshot.status.active;
  const phase = snapshot.phase;
  return {
    initialized: true,
    phase: active.phase,
    phaseFile: active["phase file"],
    state: active.state ?? phase?.status.state,
    currentTask: active["current task"] ?? phase?.status["current task"],
    lastCommit: active["last commit"] ?? phase?.status["last commit"],
    completedTasks: phase?.tasks.filter((task) => task.checked).length ?? 0,
    remainingTasks: phase?.tasks.filter((task) => !task.checked).length ?? 0,
    blockers: phase?.status.blockers,
    wipFiles: phase?.status["wip files"]
  };
}

function commandForInitializedWorkflow(cwd: string): NextRecommendation {
  const snapshot = readWorkflowSnapshot(cwd);
  const summary = summarizeWorkflow(cwd);
  const check = runCheck(cwd);
  const dirtyFiles = gitStatus(cwd).length;

  const base = {
    initialized: summary.initialized,
    phase: summary.phase,
    phaseFile: summary.phaseFile,
    state: summary.state,
    currentTask: summary.currentTask,
    blockers: summary.blockers,
    wipFiles: summary.wipFiles,
    dirtyFiles,
    checkOk: check.ok
  };

  if (!summary.initialized) {
    return {
      ...base,
      initialized: false,
      command: "initialize-monkeybars",
      reason: "MonkeyBars workflow files are missing."
    };
  }

  if (!check.ok) {
    return {
      ...base,
      command: "monkeybars check",
      reason: "Workflow state has consistency errors that should be resolved first."
    };
  }

  const blockers = summary.blockers?.trim().toLowerCase();
  if (blockers && blockers !== "none") {
    return {
      ...base,
      command: "handoff-session",
      reason: "The active phase has blockers documented."
    };
  }

  const wip = summary.wipFiles?.trim().toLowerCase();
  if ((wip && wip !== "none") || dirtyFiles > 0) {
    return {
      ...base,
      command: "start-session",
      reason: "There is documented or uncommitted work to inspect before advancing."
    };
  }

  if (summary.state === "complete" || summary.currentTask?.trim().toLowerCase() === "complete") {
    const activePhase = parsePhaseLabel(summary.phase);
    const nextPlanPhase = activePhase
      ? snapshot.planPhases.find((phase) => Number(phase.number) > Number(activePhase.number))
      : undefined;
    return {
      ...base,
      command: nextPlanPhase ? "create-phase" : "brainstorm-plan",
      reason: nextPlanPhase
        ? `Active phase is complete and Phase ${nextPlanPhase.number} exists in ${PLAN_FILE}.`
        : "The active plan appears exhausted; define the next active plan."
    };
  }

  return {
    ...base,
    command: "start-session",
    reason: "The active phase has an incomplete current task."
  };
}

export function nextRecommendation(cwd = process.cwd()): NextRecommendation {
  if (!isGitAvailable()) {
    return {
      initialized: false,
      command: "install git",
      reason: "git is not installed or not on PATH.",
      dirtyFiles: 0
    };
  }

  if (!isGitRepository(cwd)) {
    return {
      initialized: false,
      command: "git init",
      reason: "Current directory is not inside a git repository.",
      dirtyFiles: 0
    };
  }

  return commandForInitializedWorkflow(cwd);
}

function addHealth(findings: HealthFinding[], finding: HealthFinding): void {
  findings.push(finding);
}

function taskHasHint(task: PhaseTask, hint: "files" | "verify"): boolean {
  return new RegExp(`(?:^|\\|)\\s*${hint}\\s*:`, "i").test(task.text);
}

function hasHeading(text: string, heading: string): boolean {
  return new RegExp(`^##\\s+${heading}\\s*$`, "im").test(text);
}

function duplicatePlanPhaseNumbers(phases: PlanPhase[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const phase of phases) {
    if (seen.has(phase.number)) duplicates.add(phase.number);
    seen.add(phase.number);
  }
  return [...duplicates].sort((a, b) => Number(a) - Number(b));
}

function canCheckGeneratedAdapters(cwd: string): boolean {
  return existsSync(join(cwd, "workflow-src")) && existsSync(join(cwd, "monkeybars"));
}

export function health(repair = false, cwd = process.cwd()): HealthResult {
  const root = resolve(cwd);
  const findings: HealthFinding[] = [];
  const repairs: string[] = [];
  const gitAvailable = isGitAvailable();
  const gitRepository = gitAvailable && isGitRepository(root);

  if (!gitAvailable) {
    addHealth(findings, {
      severity: "error",
      code: "git-not-installed",
      message: "git is not installed or not on PATH."
    });
  } else if (!gitRepository) {
    addHealth(findings, {
      severity: "error",
      code: "not-git-repository",
      message: "Current directory is not inside a git repository."
    });
  }

  const snapshot = readWorkflowSnapshot(root);
  const initializedGitWorkflow =
    gitAvailable && gitRepository && Boolean(snapshot.status) && existsSync(snapshot.planPath);
  const performRepair = repair && initializedGitWorkflow;
  const workDir = join(root, WORK_DIR);
  if (!existsSync(workDir)) {
    addHealth(findings, {
      severity: "warning",
      code: "missing-work-directory",
      message: `Missing ${WORK_DIR}/ directory.`,
      file: WORK_DIR,
      repairable: initializedGitWorkflow
    });
    if (performRepair) {
      mkdirSync(workDir, { recursive: true });
      repairs.push(`Created ${WORK_DIR}/.`);
    }
  }

  if (!snapshot.status) {
    addHealth(findings, {
      severity: "error",
      code: "missing-status",
      message: `Missing ${STATUS_FILE}.`,
      file: STATUS_FILE
    });
  } else if (!snapshot.status.structured || Object.keys(snapshot.status.structured).length === 0) {
    addHealth(findings, {
      severity: "warning",
      code: "missing-structured-status",
      message: `${STATUS_FILE} is missing the structured MonkeyBars status block.`,
      file: STATUS_FILE,
      repairable: initializedGitWorkflow
    });
    if (performRepair) {
      migrateStatus(root);
      repairs.push(`Added structured status block to ${STATUS_FILE}.`);
    }
  }

  if (!existsSync(snapshot.planPath)) {
    addHealth(findings, {
      severity: "error",
      code: "missing-plan",
      message: `Missing ${PLAN_FILE}.`,
      file: PLAN_FILE
    });
  } else {
    if (snapshot.planPhases.length === 0) {
      addHealth(findings, {
        severity: "error",
        code: "plan-has-no-phases",
        message: `${PLAN_FILE} has no parseable phase headings. Expected headings like '## Phase 1 — Name'.`,
        file: PLAN_FILE
      });
    }
    for (const duplicate of duplicatePlanPhaseNumbers(snapshot.planPhases)) {
      addHealth(findings, {
        severity: "error",
        code: "duplicate-plan-phase",
        message: `${PLAN_FILE} defines Phase ${duplicate} more than once.`,
        file: PLAN_FILE
      });
    }
  }

  if (snapshot.status && !snapshot.phase) {
    addHealth(findings, {
      severity: "error",
      code: "missing-active-phase-file",
      message: `The active phase file referenced by ${STATUS_FILE} is missing.`,
      file: snapshot.status.active["phase file"] ?? STATUS_FILE
    });
  }

  if (snapshot.phase) {
    const phaseText = readFileSync(snapshot.phase.path, "utf8");
    if (!hasHeading(phaseText, "Coverage")) {
      addHealth(findings, {
        severity: "warning",
        code: "missing-coverage-section",
        message: "Active phase file has no ## Coverage section mapping plan items to tasks.",
        file: displayPath(snapshot.phase.path)
      });
    }

    if (snapshot.phase.tasks.length === 0) {
      addHealth(findings, {
        severity: "warning",
        code: "phase-has-no-tasks",
        message: "Active phase file has no parseable tasks.",
        file: displayPath(snapshot.phase.path)
      });
    }

    for (const task of snapshot.phase.tasks.filter((candidate) => !candidate.checked)) {
      if (!taskHasHint(task, "files")) {
        addHealth(findings, {
          severity: "warning",
          code: "task-missing-files-hint",
          message: `Task ${task.id} is missing a files: hint.`,
          file: displayPath(snapshot.phase.path)
        });
      }
      if (!taskHasHint(task, "verify")) {
        addHealth(findings, {
          severity: "warning",
          code: "task-missing-verify-hint",
          message: `Task ${task.id} is missing a verify: hint.`,
          file: displayPath(snapshot.phase.path)
        });
      }
      if (/(?:\bTODO\b|\[command\]|\bcoming soon\b)/i.test(task.text)) {
        addHealth(findings, {
          severity: "warning",
          code: "task-has-placeholder",
          message: `Task ${task.id} contains placeholder verification text.`,
          file: displayPath(snapshot.phase.path)
        });
      }
    }
  }

  const agentsPath = join(root, "AGENTS.md");
  if (!existsSync(agentsPath)) {
    addHealth(findings, {
      severity: "warning",
      code: "missing-agents",
      message: "Missing AGENTS.md with project workflow rules.",
      file: "AGENTS.md"
    });
  } else {
    const agentsText = readFileSync(agentsPath, "utf8");
    if (!hasHeading(agentsText, "Preflight Checks")) {
      addHealth(findings, {
        severity: "warning",
        code: "missing-preflight-section",
        message: "AGENTS.md has no ## Preflight Checks section.",
        file: "AGENTS.md"
      });
    } else if (extractPreflightCommands(agentsText).length === 0 && !/no preflight/i.test(agentsText)) {
      addHealth(findings, {
        severity: "warning",
        code: "empty-preflight-section",
        message: "AGENTS.md has a preflight section but no commands or explicit no-preflight note.",
        file: "AGENTS.md"
      });
    }
  }

  if (canCheckGeneratedAdapters(root)) {
    const generated = checkGeneratedAdapters({ root });
    if (!generated.ok) {
      for (const difference of generated.differences) {
        addHealth(findings, {
          severity: "warning",
          code: "generated-adapter-drift",
          message: difference,
          file: "monkeybars"
        });
      }
    }
  }

  const hasErrors = findings.some((finding) => finding.severity === "error");
  return { ok: !hasErrors, repaired: repair && repairs.length > 0, findings, repairs };
}

function updateBulletSection(text: string, heading: string, fields: Record<string, string>): string {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return text;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      end = index;
      break;
    }
  }

  const seen = new Set<string>();
  for (let index = start + 1; index < end; index += 1) {
    const match = lines[index].match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    if (fields[key] === undefined) continue;
    lines[index] = `- **${match[1].trim()}:** ${fields[key]}`;
    seen.add(key);
  }

  const missing = Object.entries(fields).filter(([key]) => !seen.has(key));
  if (missing.length > 0) {
    const insertAt = end;
    lines.splice(
      insertAt,
      0,
      ...missing.map(([key, value]) => `- **${titleCaseField(key)}:** ${value}`)
    );
  }

  return lines.join("\n");
}

function titleCaseField(key: string): string {
  return key.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function updateLastUpdated(text: string, date: string): string {
  if (/^> Last updated:/m.test(text)) {
    return text.replace(/^> Last updated:.*$/m, `> Last updated: ${date}`);
  }
  return text;
}

function updatePhaseSummary(text: string, phaseNumber: string, title: string, state: string): string {
  const lines = text.split(/\r?\n/);
  const heading = lines.findIndex((line) => line.trim() === "## Phase Summary");
  if (heading === -1) return text;

  let end = lines.length;
  for (let index = heading + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      end = index;
      break;
    }
  }

  const rowPattern = new RegExp(`^\\|\\s*${phaseNumber}\\s*\\|`);
  const row = `| ${phaseNumber} | ${title} | ${state} |`;
  const existing = lines.findIndex((line, index) => index > heading && index < end && rowPattern.test(line));
  if (existing !== -1) {
    lines[existing] = row;
  } else {
    lines.splice(end, 0, row);
  }
  return lines.join("\n");
}

function statusFieldsForWrite(
  status: StatusFile,
  phaseLabel: { number: string; title: string },
  phaseFile: string,
  state: string,
  currentTask: string,
  commit: string
): Record<string, string> {
  return {
    ...status.active,
    "phase file": phaseFile,
    phase: phaseDisplay(phaseLabel.number, phaseLabel.title),
    state,
    "current task": currentTask,
    "last commit": commit,
    "last updated": today()
  };
}

export function migrateStatus(cwd = process.cwd()): string {
  const snapshot = readWorkflowSnapshot(cwd);
  if (!snapshot.status) {
    throw new Error(`Missing ${STATUS_FILE}.`);
  }

  const fields = {
    ...snapshot.status.active,
    "last updated": snapshot.status.active["last updated"] ?? today()
  };
  const next = upsertStructuredStatusFields(snapshot.status.text ?? readFileSync(snapshot.statusPath, "utf8"), fields);
  writeFileSync(snapshot.statusPath, next.endsWith("\n") ? next : `${next}\n`);
  return snapshot.statusPath;
}

export function advanceTask(taskId: string, commit: string, cwd = process.cwd()): AdvanceResult {
  if (!taskId.trim()) throw new Error("--task is required.");
  if (!commit.trim()) throw new Error("--commit is required.");

  const snapshot = readWorkflowSnapshot(cwd);
  if (!snapshot.status) throw new Error(`Missing ${STATUS_FILE}.`);
  if (!snapshot.phase || !snapshot.phasePath) throw new Error("Active phase file is missing.");

  const phaseFile = snapshot.status.active["phase file"];
  if (!phaseFile) throw new Error(`${STATUS_FILE} does not define Active Work phase file.`);

  const normalizedTask = normalizeTaskId(taskId);
  const phase = snapshot.phase;
  const targetTask = phase.tasks.find((task) => task.id === normalizedTask);
  if (!targetTask) throw new Error(`Task ${normalizedTask} was not found in ${phaseFile}.`);
  if (targetTask.checked) throw new Error(`Task ${normalizedTask} is already checked.`);

  const firstUnchecked = phase.tasks.find((task) => !task.checked);
  if (firstUnchecked && firstUnchecked.id !== normalizedTask) {
    throw new Error(`Task ${normalizedTask} cannot advance before first unchecked task ${firstUnchecked.id}.`);
  }

  const phaseLabel = parsePhaseLabel(phase.title);
  if (!phaseLabel) throw new Error(`Active phase file title must look like "# Phase 1 \u2014 Title".`);

  const lines = readFileSync(snapshot.phasePath, "utf8").split(/\r?\n/);
  lines[targetTask.line - 1] = lines[targetTask.line - 1].replace(/^- \[ \]/, "- [x]");
  const nextTask = phase.tasks.find((task) => !task.checked && task.id !== normalizedTask);
  const nextTaskText = taskDisplay(nextTask);
  const nextState = nextTask ? "in_progress" : "complete";
  let phaseText = lines.join("\n");
  phaseText = updateBulletSection(phaseText, "## Status", {
    state: nextState,
    "current task": nextTaskText,
    "last commit": commit,
    "wip files": "none"
  });
  phaseText = appendLogEntry(phaseText, normalizedTask, nextTaskText, commit);
  writeFileSync(snapshot.phasePath, phaseText.endsWith("\n") ? phaseText : `${phaseText}\n`);

  const statusFields = statusFieldsForWrite(snapshot.status, phaseLabel, phaseFile, nextState, nextTaskText, commit);
  const { "last updated": _lastUpdated, ...activeStatusFields } = statusFields;
  let statusText = snapshot.status.text ?? readFileSync(snapshot.statusPath, "utf8");
  statusText = updateLastUpdated(statusText, statusFields["last updated"]);
  statusText = updateBulletSection(statusText, "## Active Work", activeStatusFields);
  statusText = updatePhaseSummary(statusText, phaseLabel.number, phaseLabel.title, nextState);
  statusText = upsertStructuredStatusFields(statusText, statusFields);
  writeFileSync(snapshot.statusPath, statusText.endsWith("\n") ? statusText : `${statusText}\n`);

  return {
    phaseFile,
    completedTask: normalizedTask,
    nextTask: nextTaskText,
    state: nextState,
    commit
  };
}

function appendLogEntry(text: string, taskId: string, nextTask: string, commit: string): string {
  const lines = text.split(/\r?\n/);
  const logIndex = lines.findIndex((line) => line.trim() === "## Log");
  const entry = `- ${today()}: Completed ${taskId}; next task ${nextTask}; commit subject \`${commit}\`.`;
  if (logIndex === -1) {
    return `${text.trimEnd()}\n\n## Log\n\n${entry}\n`;
  }
  const insertAt = logIndex + 1;
  if (lines[insertAt]?.trim() === "") {
    lines.splice(insertAt + 1, 0, entry);
  } else {
    lines.splice(insertAt, 0, "", entry);
  }
  return lines.join("\n");
}

export function preflight(dryRun: boolean, cwd = process.cwd()): PreflightResult {
  const agentsPath = join(resolve(cwd), "AGENTS.md");
  const commands = existsSync(agentsPath) ? extractPreflightCommands(readFileSync(agentsPath, "utf8")) : [];
  if (dryRun || commands.length === 0) {
    return { commands, ok: true, dryRun };
  }

  for (const command of commands) {
    const result = spawnSync(command, {
      cwd,
      shell: true,
      stdio: "inherit"
    });
    if (result.status !== 0) {
      return {
        commands,
        ok: false,
        dryRun,
        failedCommand: command,
        status: result.status
      };
    }
  }

  return { commands, ok: true, dryRun };
}

export function doctor(cwd = process.cwd()): string[] {
  const lines: string[] = [];
  lines.push(`Node: ${process.version}`);
  const gitVer = gitVersion();
  lines.push(`Git: ${gitVer ?? "not found"}`);
  if (isGitAvailable()) {
    lines.push(`Git repository: ${isGitRepository(cwd) ? "yes" : "no"}`);
  }

  const root = resolve(cwd);
  const packageAssets = [
    ".opencode/commands",
    ".claude/skills",
    ".codex/plugins/monkeybars/.codex-plugin/plugin.json",
    ".codex/hooks/monkeybars-workflow-context.js",
    ".opencode/plugins/monkeybars-workflow.js",
    ".agents/plugins/marketplace.json"
  ];
  for (const asset of packageAssets) {
    lines.push(`${asset}: ${existsSync(join(root, asset)) ? "present" : "missing"}`);
  }

  const snapshot = readWorkflowSnapshot(cwd);
  lines.push(`${STATUS_FILE}: ${snapshot.status ? "present" : "missing"}`);
  lines.push(`${PLAN_FILE}: ${existsSync(snapshot.planPath) ? "present" : "missing"}`);
  lines.push(`active phase file: ${snapshot.phase ? displayPath(snapshot.phase.path) : "missing"}`);
  lines.push(`dirty files: ${gitStatus(cwd).length}`);
  return lines;
}

export function phaseFiles(cwd = process.cwd()): string[] {
  const workDir = join(resolve(cwd), WORK_DIR);
  if (!existsSync(workDir) || !statSync(workDir).isDirectory()) return [];
  return readdirSync(workDir)
    .filter((name) => /^phase-\d+\.md$/.test(name))
    .sort()
    .map((name) => join(workDir, name));
}

export function gitLogContains(subject: string, cwd = process.cwd()): boolean {
  if (!subject || subject === "none") return true;
  const subjects = recentCommitSubjects(cwd);
  return subjects.some((line) => line.trim() === subject.trim());
}
