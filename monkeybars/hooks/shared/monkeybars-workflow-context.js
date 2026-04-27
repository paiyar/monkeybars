#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function parseInput() {
  const text = readStdin().trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function findProjectRoot(start) {
  let current = resolve(start || process.cwd());
  while (true) {
    if (
      existsSync(join(current, "docs", "status.md")) ||
      existsSync(join(current, ".git")) ||
      existsSync(join(current, "AGENTS.md"))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) return resolve(start || process.cwd());
    current = parent;
  }
}

function parseBulletFields(text, heading) {
  const fields = {};
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return fields;

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## ")) break;
    const match = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (match) fields[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return fields;
}

function readFields(path, heading) {
  if (!existsSync(path)) return {};
  return parseBulletFields(readFileSync(path, "utf8"), heading);
}

function commandNames(agent) {
  if (agent === "codex") {
    return {
      start: "$start-session",
      complete: "$complete-task",
      handoff: "$handoff-session",
      boundary: "$context-boundary",
      initialize: "$initialize-monkeybars"
    };
  }

  return {
    start: "/start-session",
    complete: "/complete-task",
    handoff: "/handoff-session",
    boundary: "/context-boundary",
    initialize: "/initialize-monkeybars"
  };
}

function workflowContext(root, agent) {
  const commands = commandNames(agent);
  const statusPath = join(root, "docs", "status.md");
  const planPath = join(root, "docs", "plan.md");

  if (!existsSync(statusPath) || !existsSync(planPath)) {
    return [
      "## MonkeyBars Workflow Context",
      "",
      "MonkeyBars does not appear to be initialized in this repository.",
      `Before planned implementation work, run ${commands.initialize} to create or update the workflow files.`,
      "For a small one-off edit, proceed only if the user clearly wants to bypass the workflow."
    ].join("\n");
  }

  const active = readFields(statusPath, "## Active Work");
  const phaseFile = active["phase file"];
  const phaseFields = phaseFile ? readFields(join(root, phaseFile), "## Status") : {};

  const phase = active.phase || "unknown";
  const state = active.state || phaseFields.state || "unknown";
  const currentTask = active["current task"] || phaseFields["current task"] || "unknown";
  const blockers = phaseFields.blockers || "none";
  const wipFiles = phaseFields["wip files"] || "none";

  return [
    "## MonkeyBars Workflow Context",
    "",
    `- Active phase: ${phase}`,
    `- Current task: ${currentTask}`,
    `- State: ${state}`,
    `- Phase file: ${phaseFile || "unknown"}`,
    `- Blockers: ${blockers}`,
    `- WIP files: ${wipFiles}`,
    "",
    `At session start, use ${commands.start} to load the active phase and task before editing.`,
    `When one task is complete, use ${commands.complete} to run preflight, update tracking, and commit once.`,
    `If stopping with unfinished work, use ${commands.handoff}. After a commit or bulky context, use ${commands.boundary}.`
  ].join("\n");
}

function eventName(input) {
  return input.hook_event_name || input.hookEventName || "SessionStart";
}

function outputFor(agent, input, context) {
  const hookEventName = eventName(input);

  return {
    hookSpecificOutput: {
      hookEventName,
      additionalContext: context
    }
  };
}

const input = parseInput();
const agent = process.argv[2] === "codex" ? "codex" : "claude";
const root = findProjectRoot(input.cwd || process.cwd());
const context = workflowContext(root, agent);
console.log(JSON.stringify(outputFor(agent, input, context)));
