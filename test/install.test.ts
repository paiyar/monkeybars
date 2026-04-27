import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { installPackageTargets } from "../cli/src/install";
import { readJson, repoRoot, runCli, sourceText, tempDir } from "./helpers";

function hookCommandCount(settings: any): number {
  return Object.values(settings.hooks ?? {}).flatMap((groups: any) =>
    Array.isArray(groups) ? groups.flatMap((group) => group.hooks ?? []) : []
  ).filter((hook: any) => typeof hook.command === "string" && hook.command.includes("monkeybars-workflow-context.js")).length;
}

function writeInstallWorkflow(root: string): void {
  mkdirSync(join(root, "docs", "work"), { recursive: true });
  writeFileSync(join(root, "docs", "plan.md"), "# Implementation Plan\n");
  writeFileSync(join(root, "docs", "status.md"), `# Project Status

## Active Work

- **Phase file:** docs/work/phase-1.md
- **Phase:** 1 — Test
- **State:** in_progress
- **Current task:** T01 — first task
- **Last commit:** none
`);
  writeFileSync(join(root, "docs", "work", "phase-1.md"), `# Phase 1 — Test

## Status

- **State:** in_progress
- **Current task:** T01 — first task
- **Last commit:** none
- **Preflight:** n/a
- **Blockers:** none
- **WIP files:** src/example.ts
`);
}

describe("monkeybars install", () => {
  test("codex self-install preserves the source plugin directory", () => {
    const root = tempDir("monkeybars-install-");
    const manifest = join(root, "plugins", "monkeybars", ".codex-plugin", "plugin.json");
    const command = join(root, "plugins", "monkeybars", "commands", "start-session.md");
    const skill = join(root, "plugins", "monkeybars", "skills", "start-session", "SKILL.md");
    const marketplace = join(root, ".agents", "plugins", "marketplace.json");
    mkdirSync(join(manifest, ".."), { recursive: true });
    mkdirSync(join(command, ".."), { recursive: true });
    mkdirSync(join(skill, ".."), { recursive: true });
    mkdirSync(join(marketplace, ".."), { recursive: true });
    writeFileSync(manifest, "plugin manifest\n");
    writeFileSync(command, "opencode command\n");
    writeFileSync(skill, "skill body\n");
    writeFileSync(marketplace, "marketplace metadata\n");

    installPackageTargets(["codex"], { project: root, packageRoot: root, agentHooks: false });

    expect(readFileSync(manifest, "utf8")).toBe("plugin manifest\n");
    expect(readFileSync(command, "utf8")).toBe("opencode command\n");
    expect(readFileSync(skill, "utf8")).toBe("skill body\n");
    expect(readFileSync(marketplace, "utf8")).toBe("marketplace metadata\n");
    expect(existsSync(join(root, ".codex", "plugins", "monkeybars", ".codex-plugin", "plugin.json"))).toBe(true);
  });

  test("installs all supported targets by default", () => {
    const project = tempDir("monkeybars-install-");

    const result = runCli(["install", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars OpenCode commands");
    expect(result.stdout).toContain("Installed MonkeyBars Claude skills");
    expect(result.stdout).toContain("Installed MonkeyBars Codex plugin");
    expect(existsSync(join(project, ".opencode", "commands", "start-session.md"))).toBe(true);
    expect(existsSync(join(project, ".opencode", "plugins", "monkeybars-workflow.js"))).toBe(true);
    expect(existsSync(join(project, ".claude", "skills", "start-session", "SKILL.md"))).toBe(true);
    expect(existsSync(join(project, ".claude", "hooks", "monkeybars-workflow-context.js"))).toBe(true);
    expect(hookCommandCount(readJson(join(project, ".claude", "settings.json")))).toBe(2);
    expect(readJson(join(project, ".claude", "settings.json")).hooks.Stop).toBeUndefined();
    expect(existsSync(join(project, ".codex", "plugins", "monkeybars", ".codex-plugin", "plugin.json"))).toBe(
      true
    );
    expect(existsSync(join(project, ".agents", "plugins", "marketplace.json"))).toBe(true);
    expect(readFileSync(join(project, ".agents", "plugins", "marketplace.json"), "utf8")).toContain(
      "./.codex/plugins/monkeybars"
    );
    expect(existsSync(join(project, ".codex", "hooks", "monkeybars-workflow-context.js"))).toBe(true);
    expect(hookCommandCount(readJson(join(project, ".codex", "hooks.json")))).toBe(2);
    expect(readJson(join(project, ".codex", "hooks.json")).hooks.Stop).toBeUndefined();
    expect(readFileSync(join(project, ".codex", "config.toml"), "utf8")).toContain("codex_hooks = true");
  });

  test("installs only selected targets when provided", () => {
    const project = tempDir("monkeybars-install-");

    const result = runCli(["install", "opencode", "codex", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars OpenCode commands");
    expect(result.stdout).toContain("Installed MonkeyBars Codex plugin");
    expect(result.stdout).not.toContain("Installed MonkeyBars Claude skills");
    expect(existsSync(join(project, ".opencode", "commands", "start-session.md"))).toBe(true);
    expect(existsSync(join(project, ".opencode", "plugins", "monkeybars-workflow.js"))).toBe(true);
    expect(existsSync(join(project, ".claude", "skills"))).toBe(false);
    expect(existsSync(join(project, ".codex", "plugins", "monkeybars", ".codex-plugin", "plugin.json"))).toBe(
      true
    );
    expect(existsSync(join(project, ".codex", "hooks.json"))).toBe(true);
  });

  test("skips agent-native hooks when requested", () => {
    const project = tempDir("monkeybars-install-");

    const result = runCli(["install", "--no-agent-hooks", "--project", project]);

    expect(result.status).toBe(0);
    expect(existsSync(join(project, ".opencode", "commands", "start-session.md"))).toBe(true);
    expect(existsSync(join(project, ".opencode", "plugins", "monkeybars-workflow.js"))).toBe(false);
    expect(existsSync(join(project, ".claude", "hooks", "monkeybars-workflow-context.js"))).toBe(false);
    expect(existsSync(join(project, ".codex", "hooks.json"))).toBe(false);
  });

  test("installs OpenCode commands and replaces existing files", () => {
    const project = tempDir("monkeybars-install-");
    const targetPath = join(project, ".opencode", "commands", "project-status.md");
    const userCommand = join(project, ".opencode", "commands", "user-command.md");
    mkdirSync(join(targetPath, ".."), { recursive: true });
    writeFileSync(targetPath, "old command\n");
    writeFileSync(userCommand, "keep me\n");

    const result = runCli(["install", "opencode", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars OpenCode commands");
    expect(readFileSync(targetPath, "utf8")).toBe(sourceText("plugins/monkeybars/commands/project-status.md"));
    expect(readFileSync(userCommand, "utf8")).toBe("keep me\n");
    expect(readFileSync(join(project, ".opencode", "plugins", "monkeybars-workflow.js"), "utf8")).toBe(
      sourceText("plugins/monkeybars/hooks/opencode/monkeybars-workflow.js")
    );
  });

  test("installs Claude skills and replaces existing directories", () => {
    const project = tempDir("monkeybars-install-");
    const targetPath = join(project, ".claude", "skills", "start-session", "SKILL.md");
    const userSkill = join(project, ".claude", "skills", "user-skill", "SKILL.md");
    mkdirSync(join(targetPath, ".."), { recursive: true });
    mkdirSync(join(userSkill, ".."), { recursive: true });
    writeFileSync(targetPath, "old skill\n");
    writeFileSync(userSkill, "keep me\n");

    const result = runCli(["install", "claude", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars Claude skills");
    expect(readFileSync(targetPath, "utf8")).toBe(sourceText("plugins/monkeybars/skills/start-session/SKILL.md"));
    expect(readFileSync(userSkill, "utf8")).toBe("keep me\n");
    expect(existsSync(join(project, ".claude", "hooks", "monkeybars-workflow-context.js"))).toBe(true);
  });

  test("installs Codex plugin assets and marketplace metadata", () => {
    const project = tempDir("monkeybars-install-");
    const pluginManifest = join(project, ".codex", "plugins", "monkeybars", ".codex-plugin", "plugin.json");
    const legacyManifest = join(project, "plugins", "monkeybars", ".codex-plugin", "plugin.json");
    const marketplace = join(project, ".agents", "plugins", "marketplace.json");
    mkdirSync(join(pluginManifest, ".."), { recursive: true });
    writeFileSync(pluginManifest, "old plugin\n");
    mkdirSync(join(legacyManifest, ".."), { recursive: true });
    writeFileSync(legacyManifest, JSON.stringify({ name: "monkeybars" }));
    mkdirSync(join(marketplace, ".."), { recursive: true });
    writeFileSync(marketplace, "old marketplace\n");

    const result = runCli(["install", "codex", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars Codex plugin");
    expect(readFileSync(pluginManifest, "utf8")).toBe(
      sourceText("plugins/monkeybars/.codex-plugin/plugin.json")
    );
    expect(readFileSync(marketplace, "utf8")).toBe(sourceText(".agents/plugins/marketplace.json"));
    expect(readFileSync(marketplace, "utf8")).toContain("./.codex/plugins/monkeybars");
    expect(existsSync(join(project, "plugins", "monkeybars"))).toBe(false);
    expect(existsSync(join(project, ".codex", "hooks", "monkeybars-workflow-context.js"))).toBe(true);
  });

  test("merges agent hook config idempotently", () => {
    const project = tempDir("monkeybars-install-");
    const claudeSettings = join(project, ".claude", "settings.json");
    const codexHooks = join(project, ".codex", "hooks.json");
    const codexConfig = join(project, ".codex", "config.toml");
    mkdirSync(join(claudeSettings, ".."), { recursive: true });
    mkdirSync(join(codexHooks, ".."), { recursive: true });
    writeFileSync(claudeSettings, JSON.stringify({
      hooks: {
        SessionStart: [{ hooks: [{ type: "command", command: "echo user" }] }]
      }
    }));
    writeFileSync(codexHooks, JSON.stringify({
      hooks: {
        UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo user" }] }]
      }
    }));
    writeFileSync(codexConfig, "[features]\nother = true\n");

    expect(runCli(["install", "claude", "codex", "--project", project]).status).toBe(0);
    expect(runCli(["install", "claude", "codex", "--project", project]).status).toBe(0);

    const claude = readJson(claudeSettings);
    const codex = readJson(codexHooks);
    expect(hookCommandCount(claude)).toBe(2);
    expect(hookCommandCount(codex)).toBe(2);
    expect(claude.hooks.Stop).toBeUndefined();
    expect(codex.hooks.Stop).toBeUndefined();
    expect(JSON.stringify(claude)).toContain("echo user");
    expect(JSON.stringify(codex)).toContain("echo user");
    expect(readFileSync(codexConfig, "utf8")).toContain("other = true");
    expect(readFileSync(codexConfig, "utf8")).toContain("codex_hooks = true");
  });

  test("invalid agent config warns without failing asset install", () => {
    const project = tempDir("monkeybars-install-");
    const settings = join(project, ".claude", "settings.json");
    mkdirSync(join(settings, ".."), { recursive: true });
    writeFileSync(settings, "{ bad json");

    const result = runCli(["install", "claude", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("Warning: Skipped MonkeyBars Claude hooks");
    expect(existsSync(join(project, ".claude", "skills", "start-session", "SKILL.md"))).toBe(true);
    expect(existsSync(join(project, ".claude", "hooks", "monkeybars-workflow-context.js"))).toBe(false);
  });

  test("workflow hook context emits valid lifecycle JSON", () => {
    const project = tempDir("monkeybars-install-");
    writeInstallWorkflow(project);

    const result = spawnSync(
      "node",
      [join(repoRoot, "workflow-src", "hooks", "shared", "monkeybars-workflow-context.js"), "codex"],
      {
        cwd: project,
        input: JSON.stringify({ hook_event_name: "UserPromptSubmit", cwd: project, prompt: "continue" }),
        encoding: "utf8"
      }
    );

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(output.hookSpecificOutput.additionalContext).toContain("Current task: T01");
    expect(output.hookSpecificOutput.additionalContext).toContain("$start-session");
  });

  test("rejects unknown install targets", () => {
    const result = runCli(["install", "unknown"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Allowed choices are opencode, claude, codex");
  });

  test("rejects missing project paths", () => {
    const project = join(tempDir(), `missing-${Date.now()}`);
    rmSync(project, { recursive: true, force: true });

    const result = runCli(["install", "opencode", "--project", project]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Project path does not exist");
  });
});

describe("monkeybars install --dry-run", () => {
  test("prints planned operations without creating files", () => {
    const project = tempDir("monkeybars-install-");

    const result = runCli(["install", "--dry-run", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[opencode]");
    expect(result.stdout).toContain("[claude]");
    expect(result.stdout).toContain("[codex]");
    expect(result.stdout).toContain("start-session");
    expect(result.stdout).not.toContain("Installed MonkeyBars");
    expect(existsSync(join(project, ".opencode"))).toBe(false);
    expect(existsSync(join(project, ".claude"))).toBe(false);
    expect(existsSync(join(project, ".codex"))).toBe(false);
  });

  test("shows only selected target", () => {
    const project = tempDir("monkeybars-install-");

    const result = runCli(["install", "claude", "--dry-run", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[claude]");
    expect(result.stdout).not.toContain("[opencode]");
    expect(result.stdout).not.toContain("[codex]");
    expect(existsSync(join(project, ".claude"))).toBe(false);
  });

  test("shows hook operations when hooks enabled", () => {
    const project = tempDir("monkeybars-install-");

    const result = runCli(["install", "claude", "--dry-run", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("merge hooks into");
    expect(result.stdout).toContain("settings.json");
  });

  test("omits hook operations when --no-agent-hooks", () => {
    const project = tempDir("monkeybars-install-");

    const result = runCli(["install", "claude", "--dry-run", "--no-agent-hooks", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[claude]");
    expect(result.stdout).not.toContain("merge hooks");
    expect(result.stdout).not.toContain("settings.json");
  });
});
