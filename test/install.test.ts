import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { readJson, repoRoot, runCli, sourceText, tempDir, writeWorkflow } from "./helpers";

function hookCommandCount(settings: any): number {
  const hooks = Object.values(settings.hooks ?? {}).flatMap((groups: any) =>
    Array.isArray(groups) ? groups.flatMap((group) => group.hooks ?? []) : []
  );

  return hooks.filter(
    (hook: any) => typeof hook.command === "string" && hook.command.includes("monkeybars-workflow-context.js")
  ).length;
}

describe("monkeybars install", () => {
  test("install is purely additive within the agent footprint", () => {
    const project = tempDir("monkeybars-install-");

    // Sentinels mimic pre-existing user content in a consumer project. The installer
    // must not modify or delete any of these. Notably this includes a sibling
    // `plugins/monkeybars/` directory that looks like a different tool's plugin.
    const sentinels: Record<string, string> = {
      "README.md": "user readme\n",
      "src/index.ts": "user source\n",
      "plugins/monkeybars/.codex-plugin/plugin.json": JSON.stringify({ name: "monkeybars", note: "user copy" }),
      "plugins/monkeybars/commands/keep.md": "user command\n",
      "monkeybars/SENTINEL.md": "user dogfood file\n",
      "workflow-src/commands/SENTINEL.md": "user workflow source\n",
      ".agents/other-plugin.json": "user agent plugin\n"
    };

    for (const [rel, body] of Object.entries(sentinels)) {
      const fullPath = join(project, rel);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, body);
    }

    const result = runCli(["install", "--project", project]);
    expect(result.status).toBe(0);

    for (const [rel, body] of Object.entries(sentinels)) {
      expect(readFileSync(join(project, rel), "utf8")).toBe(body);
    }

    expect(existsSync(join(project, ".opencode", "commands", "start-session.md"))).toBe(true);
    expect(existsSync(join(project, ".claude", "skills", "start-session", "SKILL.md"))).toBe(true);
    expect(existsSync(join(project, ".codex", "plugins", "monkeybars", ".codex-plugin", "plugin.json"))).toBe(true);
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
    const claudeSettings = readJson(join(project, ".claude", "settings.json"));
    expect(hookCommandCount(claudeSettings)).toBe(2);
    expect(claudeSettings.hooks.Stop).toBeUndefined();
    expect(existsSync(join(project, ".codex", "plugins", "monkeybars", ".codex-plugin", "plugin.json"))).toBe(true);
    expect(existsSync(join(project, ".agents", "plugins", "marketplace.json"))).toBe(true);
    expect(readFileSync(join(project, ".agents", "plugins", "marketplace.json"), "utf8")).toContain(
      "./.codex/plugins/monkeybars"
    );
    expect(existsSync(join(project, ".codex", "hooks", "monkeybars-workflow-context.js"))).toBe(true);
    const codexHooks = readJson(join(project, ".codex", "hooks.json"));
    expect(hookCommandCount(codexHooks)).toBe(2);
    expect(codexHooks.hooks.Stop).toBeUndefined();
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
    expect(existsSync(join(project, ".codex", "plugins", "monkeybars", ".codex-plugin", "plugin.json"))).toBe(true);
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
    expect(readFileSync(targetPath, "utf8")).toBe(sourceText("monkeybars/commands/project-status.md"));
    expect(readFileSync(userCommand, "utf8")).toBe("keep me\n");
    expect(readFileSync(join(project, ".opencode", "plugins", "monkeybars-workflow.js"), "utf8")).toBe(
      sourceText("monkeybars/hooks/opencode/monkeybars-workflow.js")
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
    expect(readFileSync(targetPath, "utf8")).toBe(sourceText("monkeybars/skills/start-session/SKILL.md"));
    expect(readFileSync(userSkill, "utf8")).toBe("keep me\n");
    expect(existsSync(join(project, ".claude", "hooks", "monkeybars-workflow-context.js"))).toBe(true);
  });

  test("installs Codex plugin assets and marketplace metadata", () => {
    const project = tempDir("monkeybars-install-");
    const pluginManifest = join(project, ".codex", "plugins", "monkeybars", ".codex-plugin", "plugin.json");
    const marketplace = join(project, ".agents", "plugins", "marketplace.json");
    mkdirSync(join(pluginManifest, ".."), { recursive: true });
    writeFileSync(pluginManifest, "old plugin\n");
    mkdirSync(join(marketplace, ".."), { recursive: true });
    writeFileSync(marketplace, "old marketplace\n");

    const result = runCli(["install", "codex", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars Codex plugin");
    expect(readFileSync(pluginManifest, "utf8")).toBe(
      sourceText("monkeybars/.codex-plugin/plugin.json")
    );
    expect(readFileSync(marketplace, "utf8")).toBe(sourceText(".agents/plugins/marketplace.json"));
    expect(readFileSync(marketplace, "utf8")).toContain("./.codex/plugins/monkeybars");
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
    writeWorkflow(project, { state: "in_progress", wipFiles: "src/example.ts" });

    const result = spawnSync(
      "node",
      [join(repoRoot, "monkeybars", "hooks", "shared", "monkeybars-workflow-context.js"), "codex"],
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
