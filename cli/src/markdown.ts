import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { PhaseFile, PhaseTask, PlanPhase, StatusFile } from "./types.js";

export interface PhaseLabel {
  number: string;
  title: string;
}

function parseBulletFields(lines: string[], startHeading: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const start = lines.findIndex((line) => line.trim() === startHeading);
  if (start === -1) return fields;

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## ")) break;

    const match = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (match) {
      fields[match[1].trim().toLowerCase()] = match[2].trim();
    }
  }

  return fields;
}

const STRUCTURED_STATUS_START = "<!-- monkeybars:status";
const STRUCTURED_STATUS_END = "-->";

const structuredStatusKeys: Record<string, string> = {
  plan_scope: "plan scope",
  phase_file: "phase file",
  phase: "phase",
  state: "state",
  current_task: "current task",
  last_commit: "last commit",
  last_updated: "last updated"
};

export function structuredKeyForField(field: string): string {
  return field.trim().toLowerCase().replace(/\s+/g, "_");
}

export function parseStructuredStatusFields(text: string): Record<string, string> {
  const start = text.indexOf(STRUCTURED_STATUS_START);
  if (start === -1) return {};
  const contentStart = text.indexOf("\n", start);
  if (contentStart === -1) return {};
  const end = text.indexOf(STRUCTURED_STATUS_END, contentStart);
  if (end === -1) return {};

  const fields: Record<string, string> = {};
  const block = text.slice(contentStart + 1, end);
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const rawKey = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    const key = structuredStatusKeys[rawKey] ?? rawKey.replace(/_/g, " ");
    fields[key] = value;
  }
  return fields;
}

export function formatStructuredStatusFields(fields: Record<string, string>): string {
  const orderedFields = [
    "plan scope",
    "phase file",
    "phase",
    "state",
    "current task",
    "last commit",
    "last updated"
  ];
  const keys = [
    ...orderedFields.filter((key) => fields[key] !== undefined),
    ...Object.keys(fields)
      .filter((key) => !orderedFields.includes(key))
      .sort()
  ];
  return [
    STRUCTURED_STATUS_START,
    ...keys.map((key) => `${structuredKeyForField(key)}: ${fields[key]}`),
    STRUCTURED_STATUS_END
  ].join("\n");
}

export function upsertStructuredStatusFields(text: string, fields: Record<string, string>): string {
  const block = formatStructuredStatusFields(fields);
  const start = text.indexOf(STRUCTURED_STATUS_START);
  if (start !== -1) {
    const end = text.indexOf(STRUCTURED_STATUS_END, start);
    if (end !== -1) {
      return `${text.slice(0, start)}${block}${text.slice(end + STRUCTURED_STATUS_END.length)}`;
    }
  }

  const lines = text.split(/\r?\n/);
  const insertAt = lines.findIndex((line, index) => index > 0 && line.startsWith("## "));
  if (insertAt === -1) {
    return `${text.trimEnd()}\n\n${block}\n`;
  }
  lines.splice(insertAt, 0, block, "");
  return lines.join("\n");
}

function parseTasks(lines: string[]): PhaseTask[] {
  const tasks: PhaseTask[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^- \[([ xX])\]\s+([A-Za-z]+\d+)\s+(?:—|-)\s+(.+)$/);
    if (!match) continue;

    tasks.push({
      id: match[2],
      checked: match[1].toLowerCase() === "x",
      text: match[3].trim(),
      line: index + 1
    });
  }
  return tasks;
}

function sectionText(lines: string[], startHeading: string): string {
  const start = lines.findIndex((line) => line.trim() === startHeading);
  if (start === -1) return "";

  const section: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## ")) break;
    section.push(line);
  }
  return section.join("\n");
}

export function readStatusFile(path: string): StatusFile {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  const legacy = parseBulletFields(lines, "## Active Work");
  const structured = parseStructuredStatusFields(text);
  return {
    path,
    active: { ...legacy, ...structured },
    structured,
    text
  };
}

export function readPhaseFile(path: string): PhaseFile {
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

export function normalizeTaskId(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.toLowerCase() === "complete") return "complete";
  return trimmed.match(/^([A-Za-z]+\d+)/)?.[1] ?? trimmed;
}

export function parsePhaseLabel(value: string | undefined): PhaseLabel | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return undefined;

  const match = trimmed.match(/^(?:Phase\s+)?(\d+)\s+(?:—|-)\s+(.+)$/i);
  if (!match) return undefined;

  return {
    number: match[1],
    title: match[2].trim()
  };
}

export function displayPath(path: string): string {
  return path.split(/[\\/]/).slice(-3).join("/") || basename(path);
}

export function readPlanPhases(path: string): PlanPhase[] {
  const text = readFileSync(path, "utf8");
  const phases: PlanPhase[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^##\s+Phase\s+(\d+)\s+(?:—|-)\s+(.+)$/i);
    if (!match) continue;
    phases.push({
      number: match[1],
      title: match[2].trim(),
      line: index + 1
    });
  }
  return phases;
}

export function extractPreflightCommands(agentsText: string): string[] {
  const lines = agentsText.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /^##\s+Preflight Checks\s*$/i.test(line.trim()));
  if (headingIndex === -1) return [];

  const commands: string[] = [];
  let inFence = false;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## ")) break;
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
