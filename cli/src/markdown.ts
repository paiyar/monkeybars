import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { PhaseFile, PhaseTask, StatusFile } from "./types.js";

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

function parseTasks(lines: string[]): PhaseTask[] {
  const tasks: PhaseTask[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^- \[([ xX])\]\s+([A-Za-z]+\d+)\s+[—-]\s+(.+)$/);
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
  return {
    path,
    active: parseBulletFields(lines, "## Active Work")
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

  const match = trimmed.match(/^(?:Phase\s+)?(\d+)\s+[—-]\s+(.+)$/i);
  if (!match) return undefined;

  return {
    number: match[1],
    title: match[2].trim()
  };
}

export function displayPath(path: string): string {
  return path.split(/[\\/]/).slice(-3).join("/") || basename(path);
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
