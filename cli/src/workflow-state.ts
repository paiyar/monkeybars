import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
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
import type { PhaseFile, PhaseTask, PlanPhase, StatusFile } from "./types.js";

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
  const statusPath = join(root, "docs", "status.md");
  const planPath = join(root, "docs", "plan.md");
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
    throw new Error("Missing docs/status.md.");
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
  if (!snapshot.status) throw new Error("Missing docs/status.md.");
  if (!snapshot.phase || !snapshot.phasePath) throw new Error("Active phase file is missing.");

  const phaseFile = snapshot.status.active["phase file"];
  if (!phaseFile) throw new Error("docs/status.md does not define Active Work phase file.");

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
  lines.push(`docs/status.md: ${snapshot.status ? "present" : "missing"}`);
  lines.push(`docs/plan.md: ${existsSync(snapshot.planPath) ? "present" : "missing"}`);
  lines.push(`active phase file: ${snapshot.phase ? displayPath(snapshot.phase.path) : "missing"}`);
  lines.push(`dirty files: ${gitStatus(cwd).length}`);
  return lines;
}

export function phaseFiles(cwd = process.cwd()): string[] {
  const workDir = join(resolve(cwd), "docs", "work");
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
