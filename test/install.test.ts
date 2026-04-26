import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { installPackageTargets } from "../cli/src/install";

const cliPath = resolve("dist", "index.js");
const repoRoot = resolve(import.meta.dir, "..");

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), "monkeybars-install-"));
}

function runCli(args: string[], cwd = process.cwd()) {
  return spawnSync("bun", [cliPath, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function sourceText(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("monkeybars install", () => {
  test("codex self-install preserves the source plugin directory", () => {
    const root = tempProject();
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

    installPackageTargets(["codex"], { project: root, packageRoot: root });

    expect(readFileSync(manifest, "utf8")).toBe("plugin manifest\n");
    expect(readFileSync(command, "utf8")).toBe("opencode command\n");
    expect(readFileSync(skill, "utf8")).toBe("skill body\n");
    expect(readFileSync(marketplace, "utf8")).toBe("marketplace metadata\n");
  });

  test("installs all supported targets by default", () => {
    const project = tempProject();

    const result = runCli(["install", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars OpenCode commands");
    expect(result.stdout).toContain("Installed MonkeyBars Claude skills");
    expect(result.stdout).toContain("Installed MonkeyBars Codex plugin");
    expect(existsSync(join(project, ".opencode", "commands", "start-session.md"))).toBe(true);
    expect(existsSync(join(project, ".claude", "skills", "start-session", "SKILL.md"))).toBe(true);
    expect(existsSync(join(project, "plugins", "monkeybars", ".codex-plugin", "plugin.json"))).toBe(
      true
    );
    expect(existsSync(join(project, ".agents", "plugins", "marketplace.json"))).toBe(true);
  });

  test("installs only selected targets when provided", () => {
    const project = tempProject();

    const result = runCli(["install", "opencode", "codex", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars OpenCode commands");
    expect(result.stdout).toContain("Installed MonkeyBars Codex plugin");
    expect(result.stdout).not.toContain("Installed MonkeyBars Claude skills");
    expect(existsSync(join(project, ".opencode", "commands", "start-session.md"))).toBe(true);
    expect(existsSync(join(project, ".claude", "skills"))).toBe(false);
    expect(existsSync(join(project, "plugins", "monkeybars", ".codex-plugin", "plugin.json"))).toBe(
      true
    );
  });

  test("installs OpenCode commands and replaces existing files", () => {
    const project = tempProject();
    const targetPath = join(project, ".opencode", "commands", "project-status.md");
    mkdirSync(join(targetPath, ".."), { recursive: true });
    writeFileSync(targetPath, "old command\n");

    const result = runCli(["install", "opencode", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars OpenCode commands");
    expect(readFileSync(targetPath, "utf8")).toBe(sourceText("plugins/monkeybars/commands/project-status.md"));
  });

  test("installs Claude skills and replaces existing directories", () => {
    const project = tempProject();
    const targetPath = join(project, ".claude", "skills", "start-session", "SKILL.md");
    mkdirSync(join(targetPath, ".."), { recursive: true });
    writeFileSync(targetPath, "old skill\n");

    const result = runCli(["install", "claude", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars Claude skills");
    expect(readFileSync(targetPath, "utf8")).toBe(sourceText("plugins/monkeybars/skills/start-session/SKILL.md"));
  });

  test("installs Codex plugin assets and marketplace metadata", () => {
    const project = tempProject();
    const pluginManifest = join(project, "plugins", "monkeybars", ".codex-plugin", "plugin.json");
    const marketplace = join(project, ".agents", "plugins", "marketplace.json");
    mkdirSync(join(pluginManifest, ".."), { recursive: true });
    writeFileSync(pluginManifest, "old plugin\n");
    mkdirSync(join(marketplace, ".."), { recursive: true });
    writeFileSync(marketplace, "old marketplace\n");

    const result = runCli(["install", "codex", "--project", project]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installed MonkeyBars Codex plugin");
    expect(readFileSync(pluginManifest, "utf8")).toBe(
      sourceText("plugins/monkeybars/.codex-plugin/plugin.json")
    );
    expect(readFileSync(marketplace, "utf8")).toBe(sourceText(".agents/plugins/marketplace.json"));
    expect(existsSync(join(project, "plugins", "monkeybars", "bin", "index.js"))).toBe(true);
  });

  test("rejects unknown install targets", () => {
    const result = runCli(["install", "unknown"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Allowed choices are opencode, claude, codex");
  });

  test("rejects missing project paths", () => {
    const project = join(tmpdir(), `missing-${Date.now()}`);
    rmSync(project, { recursive: true, force: true });

    const result = runCli(["install", "opencode", "--project", project]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Project path does not exist");
  });
});
