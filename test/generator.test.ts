import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { generateAdapters, parseFrontmatter, renderOpenCodeCommand } from "../cli/src/generator";

function tempProject(): string {
  const root = mkdtempSync(join(tmpdir(), "agent-generator-"));
  mkdirSync(join(root, "workflow-src", "commands"), { recursive: true });
  mkdirSync(join(root, "workflow-src", "templates"), { recursive: true });
  mkdirSync(join(root, "dist"), { recursive: true });
  return root;
}

test("parseFrontmatter requires name and description", () => {
  const root = tempProject();
  const path = join(root, "workflow-src", "commands", "bad.md");
  writeFileSync(path, "---\nname: bad\n---\n\nBody");

  expect(() => parseFrontmatter(path)).toThrow(/must define name and description/);
});

test("renderOpenCodeCommand preserves opencode agent metadata", () => {
  const output = renderOpenCodeCommand(
    { name: "status", description: "Show status.", opencode_agent: "plan" },
    "## Body\n"
  );

  expect(output).toContain("description: Show status.");
  expect(output).toContain("agent: plan");
});

describe("generateAdapters", () => {
  test("generates skills, commands, templates, and CLI bin", () => {
    const root = tempProject();
    writeFileSync(join(root, "workflow-src", "commands", "status.md"), `---
name: status
description: Show status.
opencode_agent: plan
---

## When to use

Use for status.
`);
    writeFileSync(join(root, "workflow-src", "templates", "status.md"), "# Status Template\n");
    const cliPath = join(root, "dist", "index.js");
    writeFileSync(cliPath, "#!/usr/bin/env node\nconsole.log('ok');\n");
    chmodSync(cliPath, 0o755);

    const pluginPath = generateAdapters({ root });

    const skill = readFileSync(join(pluginPath, "skills", "status", "SKILL.md"), "utf8");
    expect(skill).toContain("name: status");
    expect(skill).toContain("disable-model-invocation: true");

    const command = readFileSync(join(pluginPath, "commands", "status.md"), "utf8");
    expect(command).toContain("description: Show status.");
    expect(command).toContain("agent: plan");

    expect(readFileSync(join(pluginPath, "templates", "status.md"), "utf8")).toBe("# Status Template\n");
    expect(existsSync(join(pluginPath, "bin", "index.js"))).toBe(true);
  });

  test("includes selected templates in generated adapters", () => {
    const root = tempProject();
    writeFileSync(join(root, "workflow-src", "commands", "init.md"), `---
name: init
description: Initialize workflow.
include_templates: status, phase.md
---

## Steps

Create workflow files from bundled templates.
`);
    writeFileSync(join(root, "workflow-src", "templates", "status.md"), "# Status Template\n\n```sh\nnpm test\n```\n");
    writeFileSync(join(root, "workflow-src", "templates", "phase.md"), "# Phase Template\n");

    const pluginPath = generateAdapters({ root });
    const skill = readFileSync(join(pluginPath, "skills", "init", "SKILL.md"), "utf8");
    const command = readFileSync(join(pluginPath, "commands", "init.md"), "utf8");

    for (const output of [skill, command]) {
      expect(output).toContain("## Included Templates");
      expect(output).toContain("### `templates/status.md`");
      expect(output).toContain("````markdown");
      expect(output).toContain("# Status Template");
      expect(output).toContain("### `templates/phase.md`");
      expect(output).toContain("# Phase Template");
    }
  });
});
