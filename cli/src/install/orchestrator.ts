import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { sourceDirectories, sourceFiles } from "./fs-utils.js";
import { sourcePaths, projectRootOrThrow } from "./paths.js";
import type { InstallOptions, InstallTarget, SourcePaths } from "./types.js";
import { SUPPORTED_INSTALL_TARGETS } from "./types.js";
import { installOpenCode, installOpenCodeAgentHooks } from "./targets/opencode.js";
import { installClaude, installClaudeAgentHooks } from "./targets/claude.js";
import { installCodex, installCodexAgentHooks } from "./targets/codex.js";

function installAgentHooks(target: InstallTarget, source: SourcePaths, project: string): void {
  switch (target) {
    case "opencode":
      installOpenCodeAgentHooks(project, source);
      return;
    case "claude":
      installClaudeAgentHooks(project, source);
      return;
    case "codex":
      installCodexAgentHooks(project, source);
      return;
  }
}

function runInstallTarget(
  target: InstallTarget,
  source: SourcePaths,
  project: string,
  installHooks: boolean
): void {
  switch (target) {
    case "opencode": {
      const targetPath = installOpenCode(project, source);
      console.log(`Installed MonkeyBars OpenCode commands to ${targetPath}.`);
      if (installHooks) installAgentHooks(target, source, project);
      return;
    }
    case "claude": {
      const targetPath = installClaude(project, source);
      console.log(`Installed MonkeyBars Claude skills to ${targetPath}.`);
      if (installHooks) installAgentHooks(target, source, project);
      return;
    }
    case "codex": {
      const targetPaths = installCodex(project, source);
      console.log(
        `Installed MonkeyBars Codex plugin to ${targetPaths.plugin} and marketplace metadata to ${targetPaths.marketplace}.`
      );
      if (installHooks) installAgentHooks(target, source, project);
      return;
    }
  }
}

function dryRunInstallTarget(
  target: InstallTarget,
  source: SourcePaths,
  project: string,
  installHooks: boolean
): void {
  const rel = (path: string) => relative(project, path) || path;

  switch (target) {
    case "opencode": {
      const commands = sourceFiles(join(source.plugin, "commands"));
      for (const command of commands) {
        console.log(`[opencode] copy ${command} -> ${rel(join(project, ".opencode", "commands", command))}`);
      }
      if (installHooks) {
        console.log(`[opencode] copy monkeybars-workflow.js -> ${rel(join(project, ".opencode", "plugins", "monkeybars-workflow.js"))}`);
      }
      return;
    }
    case "claude": {
      const skills = sourceDirectories(join(source.plugin, "skills"));
      for (const skill of skills) {
        console.log(`[claude] copy ${skill}/ -> ${rel(join(project, ".claude", "skills", skill))}/`);
      }
      if (installHooks) {
        console.log(`[claude] copy monkeybars-workflow-context.js -> ${rel(join(project, ".claude", "hooks", "monkeybars-workflow-context.js"))}`);
        console.log(`[claude] merge hooks into ${rel(join(project, ".claude", "settings.json"))}`);
      }
      return;
    }
    case "codex": {
      console.log(`[codex] copy plugins/monkeybars/ -> ${rel(join(project, ".codex", "plugins", "monkeybars"))}/`);
      console.log(`[codex] copy marketplace.json -> ${rel(join(project, ".agents", "plugins", "marketplace.json"))}`);
      if (installHooks) {
        console.log(`[codex] copy monkeybars-workflow-context.js -> ${rel(join(project, ".codex", "hooks", "monkeybars-workflow-context.js"))}`);
        console.log(`[codex] merge hooks into ${rel(join(project, ".codex", "hooks.json"))}`);
        console.log(`[codex] update ${rel(join(project, ".codex", "config.toml"))} (enable codex_hooks)`);
      }
      return;
    }
  }
}

export function normalizeInstallTargets(targets: readonly InstallTarget[] | undefined): InstallTarget[] {
  const selected = targets?.length ? targets : SUPPORTED_INSTALL_TARGETS;
  return [...new Set(selected)];
}

export function installPackageTargets(targets: readonly InstallTarget[] = [], options: InstallOptions = {}): void {
  const source = sourcePaths(options.packageRoot);
  const project = projectRootOrThrow(options.project);
  const installHooks = options.agentHooks ?? true;
  const dryRun = options.dryRun ?? false;

  if (!existsSync(source.plugin)) {
    throw new Error(`Missing plugin source directory: ${source.plugin}`);
  }

  if (installHooks && !existsSync(source.hooks)) {
    throw new Error(`Missing hook source directory: ${source.hooks}`);
  }

  for (const target of normalizeInstallTargets(targets)) {
    if (dryRun) {
      dryRunInstallTarget(target, source, project, installHooks);
    } else {
      runInstallTarget(target, source, project, installHooks);
    }
  }
}

export function installPackageTarget(target: InstallTarget, options: InstallOptions = {}): void {
  installPackageTargets([target], options);
}

export function __installSourcePathForTest(): string {
  return sourcePaths().plugin;
}
