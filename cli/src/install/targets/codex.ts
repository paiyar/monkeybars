import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { copyFilePreservingMode, replaceDirectory, samePath } from "../fs-utils.js";
import { addCommandHook, readJsonObject, removeMonkeyBarsHooks, warn, writeJsonObject } from "../hooks-common.js";
import type { SourcePaths } from "../types.js";

export function installCodex(project: string, source: SourcePaths): { plugin: string; marketplace: string } {
  const pluginTarget = join(project, ".codex", "plugins", "monkeybars");
  const marketplaceTarget = join(project, ".agents", "plugins", "marketplace.json");

  if (!existsSync(source.marketplace)) {
    throw new Error(`Missing marketplace metadata: ${source.marketplace}`);
  }

  if (!samePath(source.plugin, pluginTarget)) {
    replaceDirectory(source.plugin, pluginTarget);
  }

  mkdirSync(join(marketplaceTarget, ".."), { recursive: true });
  if (!samePath(source.marketplace, marketplaceTarget)) {
    copyFileSync(source.marketplace, marketplaceTarget);
  }

  return { plugin: pluginTarget, marketplace: marketplaceTarget };
}

export function installCodexAgentHooks(project: string, source: SourcePaths): void {
  const hooksPath = join(project, ".codex", "hooks.json");
  const configPath = join(project, ".codex", "config.toml");
  const settings = readJsonObject(hooksPath, "Codex");
  if (!settings) return;
  if (!updateCodexConfig(configPath)) return;

  const target = join(project, ".codex", "hooks", "monkeybars-workflow-context.js");
  copyFilePreservingMode(join(source.hooks, "shared", "monkeybars-workflow-context.js"), target);

  const command =
    "sh -c 'ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd); exec node \"$ROOT/.codex/hooks/monkeybars-workflow-context.js\" codex'";
  removeMonkeyBarsHooks(settings);
  addCommandHook(settings, "SessionStart", command, {
    matcher: "startup|resume|clear",
    statusMessage: "Loading MonkeyBars workflow context"
  });
  addCommandHook(settings, "UserPromptSubmit", command, {
    statusMessage: "Loading MonkeyBars prompt context"
  });
  writeJsonObject(hooksPath, settings);
  console.log(`Installed MonkeyBars Codex workflow hooks to ${target}.`);
}

function codexConfigWithHooksEnabled(text: string): string {
  const original = text.trimEnd();
  if (!original) return "[features]\ncodex_hooks = true\n";

  const lines = original.split(/\r?\n/);
  const featureStart = lines.findIndex((line) => /^\s*\[features\]\s*(?:#.*)?$/.test(line));
  if (featureStart === -1) {
    return `${original}\n\n[features]\ncodex_hooks = true\n`;
  }

  let featureEnd = lines.length;
  for (let index = featureStart + 1; index < lines.length; index += 1) {
    if (/^\s*\[.+\]\s*(?:#.*)?$/.test(lines[index])) {
      featureEnd = index;
      break;
    }
  }

  const existing = lines
    .slice(featureStart + 1, featureEnd)
    .findIndex((line) => /^\s*codex_hooks\s*=/.test(line));
  if (existing === -1) {
    lines.splice(featureStart + 1, 0, "codex_hooks = true");
  } else {
    lines[featureStart + 1 + existing] = "codex_hooks = true";
  }

  return `${lines.join("\n")}\n`;
}

function updateCodexConfig(path: string): boolean {
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (!isSupportedTomlShape(text)) {
    warn(`Skipped MonkeyBars Codex hooks because ${path} could not be parsed.`);
    return false;
  }

  const next = codexConfigWithHooksEnabled(text);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, next);
  return true;
}

function isSupportedTomlShape(text: string): boolean {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^\[[A-Za-z0-9_.-]+\]$/.test(line)) continue;
    if (/^[A-Za-z0-9_.-]+\s*=\s*(?:"[^"]*"|'[^']*'|true|false|[-+]?\d+(?:\.\d+)?)(?:\s+#.*)?$/.test(line)) {
      continue;
    }
    return false;
  }
  return true;
}
