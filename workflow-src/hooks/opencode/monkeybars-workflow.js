import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function findProjectRoot(start) {
  let current = resolve(start || process.cwd());
  while (true) {
    if (
      existsSync(join(current, "docs", "agents", "status.md")) ||
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

function workflowContext(root) {
  const statusPath = join(root, "docs", "agents", "status.md");
  const planPath = join(root, "docs", "agents", "plan.md");

  if (!existsSync(statusPath) || !existsSync(planPath)) {
    return [
      "## MonkeyBars Workflow Context",
      "",
      "MonkeyBars does not appear to be initialized in this repository.",
      "Before planned implementation work, run /initialize-monkeybars to create or update workflow files."
    ].join("\n");
  }

  const active = readFields(statusPath, "## Active Work");
  const phaseFile = active["phase file"];
  const phaseFields = phaseFile ? readFields(join(root, phaseFile), "## Status") : {};

  return [
    "## MonkeyBars Workflow Context",
    "",
    `- Active phase: ${active.phase || "unknown"}`,
    `- Current task: ${active["current task"] || phaseFields["current task"] || "unknown"}`,
    `- State: ${active.state || phaseFields.state || "unknown"}`,
    `- Phase file: ${phaseFile || "unknown"}`,
    `- Blockers: ${phaseFields.blockers || "none"}`,
    `- WIP files: ${phaseFields["wip files"] || "none"}`,
    "",
    "Use /start-session before editing, /complete-task after one finished task, /handoff-session when stopping mid-task, and /context-boundary after commits or bulky context."
  ].join("\n");
}

export const MonkeyBarsWorkflow = async ({ directory, worktree }) => {
  return {
    "experimental.session.compacting": async (_input, output) => {
      const root = findProjectRoot(worktree || directory || process.cwd());
      output.context.push(workflowContext(root));
    }
  };
};
