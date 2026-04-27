import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { copyFilePreservingMode, readMarkerEntries, removePath, sourceFiles, writeInstallMarker } from "../fs-utils.js";
import type { SourcePaths } from "../types.js";

export function installOpenCode(project: string, source: SourcePaths): string {
  const target = join(project, ".opencode", "commands");
  const commandSource = join(source.plugin, "commands");
  const commands = sourceFiles(commandSource);
  mkdirSync(target, { recursive: true });

  for (const stale of readMarkerEntries(target, "files")) {
    if (!commands.includes(stale)) removePath(join(target, stale));
  }

  for (const command of commands) {
    copyFilePreservingMode(join(commandSource, command), join(target, command));
  }
  writeInstallMarker(target, "files", commands);
  return target;
}

export function installOpenCodeAgentHooks(project: string, source: SourcePaths): void {
  const target = join(project, ".opencode", "plugins", "monkeybars-workflow.js");
  copyFilePreservingMode(join(source.hooks, "opencode", "monkeybars-workflow.js"), target);
  console.log(`Installed MonkeyBars OpenCode workflow hooks to ${target}.`);
}
