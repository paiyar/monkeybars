import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  displayPath,
  extractPreflightCommands,
  formatStructuredStatusFields,
  normalizeTaskId,
  parsePhaseLabel,
  parseStructuredStatusFields,
  readPhaseFile,
  readPlanPhases,
  readStatusFile,
  structuredKeyForField,
  upsertStructuredStatusFields
} from "../cli/src/markdown";
import { tempDir } from "./helpers";

// ── structuredKeyForField ──────────────────────────────────

describe("structuredKeyForField", () => {
  test("converts spaced field names to snake_case", () => {
    expect(structuredKeyForField("Current Task")).toBe("current_task");
  });

  test("handles leading and trailing whitespace", () => {
    expect(structuredKeyForField("  Current Task  ")).toBe("current_task");
  });

  test("collapses multiple spaces", () => {
    expect(structuredKeyForField("current  task")).toBe("current_task");
  });

  test("handles tabs and mixed whitespace", () => {
    expect(structuredKeyForField("current\ttask")).toBe("current_task");
  });

  test("returns empty string for empty input", () => {
    expect(structuredKeyForField("")).toBe("");
  });

  test("is idempotent for already snake_case input", () => {
    expect(structuredKeyForField("already_snake")).toBe("already_snake");
  });
});

// ── parseStructuredStatusFields ────────────────────────────

describe("parseStructuredStatusFields", () => {
  test("returns empty object when no block present", () => {
    expect(parseStructuredStatusFields("no block here")).toEqual({});
  });

  test("returns empty for block with no closing tag", () => {
    expect(parseStructuredStatusFields("<!-- monkeybars:status\nphase: 1")).toEqual({});
  });

  test("returns empty for empty block", () => {
    expect(parseStructuredStatusFields("<!-- monkeybars:status\n-->")).toEqual({});
  });

  test("parses simple key-value pairs", () => {
    const result = parseStructuredStatusFields("<!-- monkeybars:status\nphase: 1\nstate: active\n-->");
    expect(result).toEqual({ phase: "1", state: "active" });
  });

  test("handles values containing colons", () => {
    const result = parseStructuredStatusFields("<!-- monkeybars:status\nlast_commit: fix: handle edge\n-->");
    expect(result).toEqual({ "last commit": "fix: handle edge" });
  });

  test("maps known keys to human-readable names", () => {
    const result = parseStructuredStatusFields("<!-- monkeybars:status\ncurrent_task: T01\nphase_file: docs/agents/work/phase-1.md\n-->");
    expect(result).toEqual({ "current task": "T01", "phase file": "docs/agents/work/phase-1.md" });
  });

  test("maps unknown keys by replacing underscores with spaces", () => {
    const result = parseStructuredStatusFields("<!-- monkeybars:status\ncustom_key: val\n-->");
    expect(result).toEqual({ "custom key": "val" });
  });

  test("skips blank lines", () => {
    const result = parseStructuredStatusFields("<!-- monkeybars:status\n\n  \nphase: 1\n\n-->");
    expect(result).toEqual({ phase: "1" });
  });

  test("handles \\r\\n line endings", () => {
    const result = parseStructuredStatusFields("<!-- monkeybars:status\r\nphase: 1\r\n-->");
    expect(result).toEqual({ phase: "1" });
  });
});

// ── formatStructuredStatusFields ───────────────────────────

describe("formatStructuredStatusFields", () => {
  test("produces valid block for empty fields", () => {
    const result = formatStructuredStatusFields({});
    expect(result).toBe("<!-- monkeybars:status\n-->");
  });

  test("orders known fields in canonical order", () => {
    const result = formatStructuredStatusFields({
      state: "active",
      "phase file": "docs/agents/work/phase-1.md",
      phase: "1"
    });
    expect(result).toContain("phase_file: docs/agents/work/phase-1.md");
    expect(result).toContain("phase: 1");
    expect(result).toContain("state: active");
    // phase_file should come before phase, phase before state
    const phaseFilePos = result.indexOf("phase_file:");
    const phasePos = result.indexOf("phase:");
    const statePos = result.indexOf("state:");
    expect(phaseFilePos).toBeLessThan(phasePos);
    expect(phasePos).toBeLessThan(statePos);
  });

  test("appends unknown keys alphabetically after known keys", () => {
    const result = formatStructuredStatusFields({
      phase: "1",
      zebra: "z",
      alpha: "a"
    });
    const phasePos = result.indexOf("phase:");
    const alphaPos = result.indexOf("alpha:");
    const zebraPos = result.indexOf("zebra:");
    expect(phasePos).toBeLessThan(alphaPos);
    expect(alphaPos).toBeLessThan(zebraPos);
  });

  test("includes fields with empty string values", () => {
    const result = formatStructuredStatusFields({ state: "" });
    expect(result).toContain("state: ");
  });
});

// ── upsertStructuredStatusFields ───────────────────────────

describe("upsertStructuredStatusFields", () => {
  test("inserts block before first ## heading", () => {
    const text = "# Title\n\n## Section\nstuff";
    const result = upsertStructuredStatusFields(text, { phase: "1" });
    expect(result).toContain("<!-- monkeybars:status");
    const blockPos = result.indexOf("<!-- monkeybars:status");
    const sectionPos = result.indexOf("## Section");
    expect(blockPos).toBeLessThan(sectionPos);
  });

  test("appends block at end when no ## heading exists", () => {
    const text = "# Title\nno headings";
    const result = upsertStructuredStatusFields(text, { phase: "1" });
    expect(result).toContain("<!-- monkeybars:status");
    expect(result).toContain("phase: 1");
    expect(result.endsWith("\n")).toBe(true);
  });

  test("replaces existing block in place", () => {
    const text = "pre\n<!-- monkeybars:status\nold: val\n-->\npost";
    const result = upsertStructuredStatusFields(text, { phase: "2" });
    expect(result).toContain("phase: 2");
    expect(result).not.toContain("old: val");
    expect(result).toContain("post");
    expect(result).toContain("pre");
  });

  test("inserts new block when existing block has no closing tag", () => {
    const text = "<!-- monkeybars:status\nold: x\n## Section\nstuff";
    const result = upsertStructuredStatusFields(text, { phase: "1" });
    // Should insert before ## Section since closing tag wasn't found
    expect(result).toContain("phase: 1");
  });

  test("handles empty text input", () => {
    const result = upsertStructuredStatusFields("", { phase: "1" });
    expect(result).toContain("<!-- monkeybars:status");
    expect(result).toContain("phase: 1");
  });
});

// ── normalizeTaskId ────────────────────────────────────────

describe("normalizeTaskId", () => {
  test("returns empty string for undefined", () => {
    expect(normalizeTaskId(undefined)).toBe("");
  });

  test("returns empty string for empty string", () => {
    expect(normalizeTaskId("")).toBe("");
  });

  test("returns empty string for whitespace-only", () => {
    expect(normalizeTaskId("  ")).toBe("");
  });

  test("extracts task ID from full text", () => {
    expect(normalizeTaskId("T01 — first task")).toBe("T01");
  });

  test("returns bare task ID unchanged", () => {
    expect(normalizeTaskId("T01")).toBe("T01");
  });

  test("returns 'complete' for lowercase", () => {
    expect(normalizeTaskId("complete")).toBe("complete");
  });

  test("returns 'complete' for mixed case", () => {
    expect(normalizeTaskId("Complete")).toBe("complete");
  });

  test("returns 'complete' for uppercase", () => {
    expect(normalizeTaskId("COMPLETE")).toBe("complete");
  });

  test("handles leading whitespace", () => {
    expect(normalizeTaskId("  T01 — padded  ")).toBe("T01");
  });

  test("returns raw trimmed string when no letter+digit prefix found", () => {
    expect(normalizeTaskId("— no id")).toBe("— no id");
  });
});

// ── parsePhaseLabel ────────────────────────────────────────

describe("parsePhaseLabel", () => {
  test("returns undefined for undefined input", () => {
    expect(parsePhaseLabel(undefined)).toBeUndefined();
  });

  test("returns undefined for empty string", () => {
    expect(parsePhaseLabel("")).toBeUndefined();
  });

  test("parses number with em-dash", () => {
    expect(parsePhaseLabel("1 — Test")).toEqual({ number: "1", title: "Test" });
  });

  test("parses with Phase prefix", () => {
    expect(parsePhaseLabel("Phase 1 — Test")).toEqual({ number: "1", title: "Test" });
  });

  test("is case-insensitive for Phase prefix", () => {
    expect(parsePhaseLabel("phase 1 — Test")).toEqual({ number: "1", title: "Test" });
  });

  test("parses with hyphen separator", () => {
    expect(parsePhaseLabel("1 - Test")).toEqual({ number: "1", title: "Test" });
  });

  test("handles multi-digit phase numbers", () => {
    expect(parsePhaseLabel("12 — Multi-digit")).toEqual({ number: "12", title: "Multi-digit" });
  });

  test("returns undefined for invalid label", () => {
    expect(parsePhaseLabel("Phase One")).toBeUndefined();
  });

  test("returns undefined for missing separator", () => {
    expect(parsePhaseLabel("1 Test")).toBeUndefined();
  });

  test("does not match en-dash as separator", () => {
    // en-dash (U+2013) is NOT the same as em-dash (U+2014) or hyphen (U+002D)
    expect(parsePhaseLabel("1 \u2013 Test")).toBeUndefined();
  });

  test("handles leading/trailing whitespace", () => {
    expect(parsePhaseLabel("  1 — Test  ")).toEqual({ number: "1", title: "Test" });
  });
});

// ── displayPath ────────────────────────────────────────────

describe("displayPath", () => {
  test("shows last 3 segments of long path", () => {
    expect(displayPath("/a/b/c/d/e.md")).toBe("c/d/e.md");
  });

  test("returns full path for short paths", () => {
    expect(displayPath("a/b.md")).toBe("a/b.md");
  });

  test("returns single segment unchanged", () => {
    expect(displayPath("file.md")).toBe("file.md");
  });

  test("handles 3 segment path", () => {
    expect(displayPath("a/b/c.md")).toBe("a/b/c.md");
  });
});

// ── readPhaseFile ──────────────────────────────────────────

describe("readPhaseFile", () => {
  test("parses a complete phase file", () => {
    const root = tempDir();
    const path = join(root, "phase.md");
    writeFileSync(path, `# Phase 1 — Test

## Status

- **State:** in_progress
- **Current task:** T01 — first task

## Tasks

- [x] T01 — completed task | files
- [ ] T02 — pending task | files

## Log

Some log text.
`);
    const result = readPhaseFile(path);
    expect(result.title).toBe("Phase 1 — Test");
    expect(result.status.state).toBe("in_progress");
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].id).toBe("T01");
    expect(result.tasks[0].checked).toBe(true);
    expect(result.tasks[1].id).toBe("T02");
    expect(result.tasks[1].checked).toBe(false);
    expect(result.logText).toContain("Some log text.");
  });

  test("handles uppercase X in checkbox", () => {
    const root = tempDir();
    const path = join(root, "phase.md");
    writeFileSync(path, `# Phase

## Tasks

- [X] T01 — task one | files
`);
    const result = readPhaseFile(path);
    expect(result.tasks[0].checked).toBe(true);
  });

  test("returns undefined title when no H1 heading exists", () => {
    const root = tempDir();
    const path = join(root, "phase.md");
    writeFileSync(path, `## Status

- **State:** not_started

## Tasks

- [ ] T01 — task one | files
`);
    const result = readPhaseFile(path);
    expect(result.title).toBeUndefined();
  });

  test("skips non-matching lines in task section", () => {
    const root = tempDir();
    const path = join(root, "phase.md");
    writeFileSync(path, `# Phase

## Tasks

Some intro text.
- [ ] T01 — task one | files
Not a task line.
- [ ] T02 — task two | files
`);
    const result = readPhaseFile(path);
    expect(result.tasks).toHaveLength(2);
  });
});

// ── readStatusFile ─────────────────────────────────────────

describe("readStatusFile", () => {
  test("structured block takes precedence over legacy bullets", () => {
    const root = tempDir();
    const path = join(root, "status.md");
    writeFileSync(path, `# Project Status

<!-- monkeybars:status
current_task: T01 — structured
-->

## Active Work

- **Current task:** T02 — legacy
`);
    const result = readStatusFile(path);
    expect(result.active["current task"]).toBe("T01 — structured");
  });

  test("reads legacy bullets when no structured block", () => {
    const root = tempDir();
    const path = join(root, "status.md");
    writeFileSync(path, `# Project Status

## Active Work

- **Phase:** 1 — Test
- **State:** not_started
- **Current task:** T01 — first task
`);
    const result = readStatusFile(path);
    expect(result.active.phase).toBe("1 — Test");
    expect(result.active.state).toBe("not_started");
    expect(result.active["current task"]).toBe("T01 — first task");
  });

  test("returns empty structured when no block present", () => {
    const root = tempDir();
    const path = join(root, "status.md");
    writeFileSync(path, `# Project Status

## Active Work

- **State:** not_started
`);
    const result = readStatusFile(path);
    expect(result.structured).toEqual({});
  });
});

// ── readPlanPhases ─────────────────────────────────────────

describe("readPlanPhases", () => {
  test("extracts multiple phase headings", () => {
    const root = tempDir();
    const path = join(root, "plan.md");
    writeFileSync(path, `# Implementation Plan

## Phase 1 — Foundation

Content.

## Phase 2 — Features

More content.

## Phase 3 — Polish

Final content.
`);
    const result = readPlanPhases(path);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ number: "1", title: "Foundation", line: 3 });
    expect(result[1]).toEqual({ number: "2", title: "Features", line: 7 });
    expect(result[2]).toEqual({ number: "3", title: "Polish", line: 11 });
  });

  test("returns empty array when no phases found", () => {
    const root = tempDir();
    const path = join(root, "plan.md");
    writeFileSync(path, "# Implementation Plan\n\nNo phases yet.\n");
    const result = readPlanPhases(path);
    expect(result).toEqual([]);
  });

  test("skips non-phase ## headings", () => {
    const root = tempDir();
    const path = join(root, "plan.md");
    writeFileSync(path, `# Implementation Plan

## Overview

Context.

## Phase 1 — Test

Content.

## Appendix

More.
`);
    const result = readPlanPhases(path);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe("1");
  });
});

// ── extractPreflightCommands ───────────────────────────────

describe("extractPreflightCommands", () => {
  test("extracts commands from code block under heading", () => {
    const result = extractPreflightCommands("## Preflight Checks\n\n```\nbun test\n```");
    expect(result).toEqual(["bun test"]);
  });

  test("handles code block with language specifier", () => {
    const result = extractPreflightCommands("## Preflight Checks\n\n```bash\nbun test\nbun lint\n```");
    expect(result).toEqual(["bun test", "bun lint"]);
  });

  test("skips [fill in] placeholder lines", () => {
    const result = extractPreflightCommands("## Preflight Checks\n\n```\n[fill in your command]\n```");
    expect(result).toEqual([]);
  });

  test("returns empty when heading not found", () => {
    const result = extractPreflightCommands("## Other Section\n\n```\nbun test\n```");
    expect(result).toEqual([]);
  });

  test("skips blank lines within code block", () => {
    const result = extractPreflightCommands("## Preflight Checks\n\n```\nbun test\n  \n\nbun lint\n```");
    expect(result).toEqual(["bun test", "bun lint"]);
  });

  test("extracts from multiple code blocks under heading", () => {
    const result = extractPreflightCommands("## Preflight Checks\n\n```\ncmd1\n```\n\ntext\n\n```\ncmd2\n```");
    expect(result).toEqual(["cmd1", "cmd2"]);
  });

  test("stops at next ## heading", () => {
    const result = extractPreflightCommands("## Preflight Checks\n\n```\ncmd1\n```\n\n## Next Section\n\n```\ncmd2\n```");
    expect(result).toEqual(["cmd1"]);
  });

  test("returns empty when heading exists but no code blocks", () => {
    const result = extractPreflightCommands("## Preflight Checks\n\nSome text but no code.");
    expect(result).toEqual([]);
  });
});
