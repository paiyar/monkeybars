import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { copyDirectoryInto, copyFilePreservingMode, readMarkerEntries, removePath, sourceDirectories, writeInstallMarker } from "../fs-utils.js";
import { addCommandHook, readJsonObject, removeMonkeyBarsHooks, writeJsonObject } from "../hooks-common.js";
import type { SourcePaths } from "../types.js";

export function installClaude(project: string, source: SourcePaths): string {
  const target = join(project, ".claude", "skills");
  const skillSource = join(source.plugin, "skills");
  const skills = sourceDirectories(skillSource);
  mkdirSync(target, { recursive: true });

  for (const stale of readMarkerEntries(target, "directories")) {
    if (!skills.includes(stale)) removePath(join(target, stale));
  }

  for (const skill of skills) {
    copyDirectoryInto(join(skillSource, skill), join(target, skill));
  }
  writeInstallMarker(target, "directories", skills);
  return target;
}

export function installClaudeAgentHooks(project: string, source: SourcePaths): void {
  const settingsPath = join(project, ".claude", "settings.json");
  const settings = readJsonObject(settingsPath, "Claude");
  if (!settings) return;

  const target = join(project, ".claude", "hooks", "monkeybars-workflow-context.js");
  copyFilePreservingMode(join(source.hooks, "shared", "monkeybars-workflow-context.js"), target);

  const command = 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/monkeybars-workflow-context.js claude';
  removeMonkeyBarsHooks(settings);
  addCommandHook(settings, "SessionStart", command, {
    matcher: "startup|resume|clear|compact",
    statusMessage: "Loading MonkeyBars workflow context"
  });
  addCommandHook(settings, "UserPromptSubmit", command, {
    statusMessage: "Loading MonkeyBars prompt context"
  });
  writeJsonObject(settingsPath, settings);
  console.log(`Installed MonkeyBars Claude workflow hooks to ${target}.`);
}
