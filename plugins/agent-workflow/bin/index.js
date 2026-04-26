#!/usr/bin/env node

// cli/src/hooks.ts
import { chmodSync, existsSync as existsSync2, mkdirSync, readFileSync as readFileSync2, rmSync, writeFileSync } from "node:fs";
import { resolve as resolve2 } from "node:path";
import { fileURLToPath } from "node:url";

// cli/src/git.ts
import { execFileSync } from "node:child_process";
function git(args, cwd = process.cwd()) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return;
  }
}
function gitStatus(cwd = process.cwd()) {
  const output = git(["status", "--short"], cwd);
  if (!output)
    return [];
  return output.split(/\r?\n/).filter(Boolean);
}
function recentCommits(cwd = process.cwd()) {
  const output = git(["log", "--oneline", "-n", "100"], cwd);
  if (!output)
    return [];
  return output.split(/\r?\n/).filter(Boolean);
}
function isGitRepository(cwd = process.cwd()) {
  return git(["rev-parse", "--is-inside-work-tree"], cwd) === "true";
}
function gitHooksDir(cwd = process.cwd()) {
  return git(["rev-parse", "--git-path", "hooks"], cwd);
}

// cli/src/markdown.ts
import { readFileSync } from "node:fs";
import { basename } from "node:path";
function parseBulletFields(lines, startHeading) {
  const fields = {};
  const start = lines.findIndex((line) => line.trim() === startHeading);
  if (start === -1)
    return fields;
  for (let index = start + 1;index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## "))
      break;
    const match = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (match) {
      fields[match[1].trim().toLowerCase()] = match[2].trim();
    }
  }
  return fields;
}
function parseTasks(lines) {
  const tasks = [];
  for (let index = 0;index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^- \[([ xX])\]\s+([A-Za-z]+\d+)\s+[—-]\s+(.+)$/);
    if (!match)
      continue;
    tasks.push({
      id: match[2],
      checked: match[1].toLowerCase() === "x",
      text: match[3].trim(),
      line: index + 1
    });
  }
  return tasks;
}
function sectionText(lines, startHeading) {
  const start = lines.findIndex((line) => line.trim() === startHeading);
  if (start === -1)
    return "";
  const section = [];
  for (let index = start + 1;index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## "))
      break;
    section.push(line);
  }
  return section.join(`
`);
}
function readStatusFile(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  return {
    path,
    active: parseBulletFields(lines, "## Active Work")
  };
}
function readPhaseFile(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  return {
    path,
    title: lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "").trim(),
    status: parseBulletFields(lines, "## Status"),
    tasks: parseTasks(lines),
    logText: sectionText(lines, "## Log")
  };
}
function normalizeTaskId(value) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed)
    return "";
  if (trimmed.toLowerCase() === "complete")
    return "complete";
  return trimmed.match(/^([A-Za-z]+\d+)/)?.[1] ?? trimmed;
}
function parsePhaseLabel(value) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed)
    return;
  const match = trimmed.match(/^(?:Phase\s+)?(\d+)\s+[—-]\s+(.+)$/i);
  if (!match)
    return;
  return {
    number: match[1],
    title: match[2].trim()
  };
}
function displayPath(path) {
  return path.split(/[\\/]/).slice(-3).join("/") || basename(path);
}
function extractPreflightCommands(agentsText) {
  const lines = agentsText.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /^##\s+Preflight Checks\s*$/i.test(line.trim()));
  if (headingIndex === -1)
    return [];
  const commands = [];
  let inFence = false;
  for (let index = headingIndex + 1;index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## "))
      break;
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence && line.trim() && !line.includes("[fill in")) {
      commands.push(line.trim());
    }
  }
  return commands;
}

// cli/src/check.ts
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
function add(findings, finding) {
  findings.push(finding);
}
function isLastCommitValid(value, cwd) {
  if (!value || value === "none")
    return true;
  const commits = recentCommits(cwd);
  return commits.some((commit) => commit.includes(value) || value.includes(commit));
}
function wipDocumented(wipValue, logText, dirty) {
  if (dirty.length === 0)
    return true;
  const value = wipValue?.trim() ?? "";
  if (value && value.toLowerCase() !== "none")
    return true;
  return dirty.some((entry) => {
    const file = entry.slice(3).trim();
    return file && logText.includes(file);
  });
}
function runCheck(cwd = process.cwd()) {
  const findings = [];
  const statusPath = join(cwd, "docs", "status.md");
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
  if (statusPhase && phaseLabel && (statusPhase.number !== phaseLabel.number || statusPhase.title !== phaseLabel.title)) {
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
function printCheckResult(result) {
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

// cli/src/hooks.ts
var MANAGED_MARKER = "agent-workflow managed hook";
var SUPPORTED_HOOKS = ["pre-commit", "post-commit", "pre-push"];
function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
function currentCliPath() {
  return process.argv[1] ? resolve2(process.argv[1]) : fileURLToPath(import.meta.url);
}
function hookScript(hookName, cliPath) {
  return [
    "#!/bin/sh",
    `# ${MANAGED_MARKER}`,
    `exec node ${shellQuote(cliPath)} hooks run ${hookName} "$@"`,
    ""
  ].join(`
`);
}
function hooksDirOrThrow(cwd) {
  const hooksDir = gitHooksDir(cwd);
  if (!hooksDir) {
    throw new Error("Not inside a git repository; cannot locate .git/hooks.");
  }
  return resolve2(cwd, hooksDir);
}
function installHooks(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const hooksDir = hooksDirOrThrow(cwd);
  const cliPath = options.cliPath ?? currentCliPath();
  mkdirSync(hooksDir, { recursive: true });
  for (const hookName of SUPPORTED_HOOKS) {
    const path = resolve2(hooksDir, hookName);
    if (existsSync2(path)) {
      const existing = readFileSync2(path, "utf8");
      if (!existing.includes(MANAGED_MARKER) && !options.force) {
        throw new Error(`Refusing to overwrite existing ${hookName}; rerun with --force.`);
      }
    }
    writeFileSync(path, hookScript(hookName, cliPath), { mode: 493 });
    chmodSync(path, 493);
  }
  console.log(`Installed Agent Workflow hooks in ${hooksDir}.`);
}
function uninstallHooks(cwd = process.cwd()) {
  const hooksDir = hooksDirOrThrow(cwd);
  let removed = 0;
  for (const hookName of SUPPORTED_HOOKS) {
    const path = resolve2(hooksDir, hookName);
    if (!existsSync2(path))
      continue;
    const existing = readFileSync2(path, "utf8");
    if (!existing.includes(MANAGED_MARKER))
      continue;
    rmSync(path);
    removed += 1;
  }
  console.log(`Removed ${removed} Agent Workflow hook(s).`);
}
function printPreflightReminder(cwd) {
  const agentsPath = resolve2(cwd, "AGENTS.md");
  if (!existsSync2(agentsPath))
    return;
  const commands = extractPreflightCommands(readFileSync2(agentsPath, "utf8"));
  if (commands.length === 0)
    return;
  console.log("Project preflight checks documented in AGENTS.md:");
  for (const command of commands) {
    console.log(`  ${command}`);
  }
}
function runHook(hookName, cwd = process.cwd()) {
  if (!SUPPORTED_HOOKS.includes(hookName)) {
    console.error(`Unsupported hook: ${hookName}`);
    return 2;
  }
  if (hookName === "post-commit") {
    console.log("Agent Workflow: commit recorded. Consider running /context-boundary before continuing.");
    return 0;
  }
  const result = runCheck(cwd);
  printCheckResult(result);
  if (!result.ok)
    return 1;
  if (hookName === "pre-push") {
    printPreflightReminder(cwd);
  }
  return 0;
}

// cli/src/index.ts
function printHelp() {
  console.log(`agent-workflow

Usage:
  agent-workflow check [--json]
  agent-workflow hooks install [--force]
  agent-workflow hooks uninstall
  agent-workflow hooks run <pre-commit|post-commit|pre-push>
`);
}
function main(argv) {
  const [command, ...args] = argv;
  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return 0;
  }
  if (command === "check") {
    const result = runCheck();
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printCheckResult(result);
    }
    return result.ok ? 0 : 1;
  }
  if (command === "hooks") {
    const [subcommand, ...hookArgs] = args;
    if (subcommand === "install") {
      installHooks({ force: hookArgs.includes("--force") });
      return 0;
    }
    if (subcommand === "uninstall") {
      uninstallHooks();
      return 0;
    }
    if (subcommand === "run") {
      const [hookName] = hookArgs;
      return runHook(hookName ?? "");
    }
  }
  printHelp();
  return 2;
}
try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
