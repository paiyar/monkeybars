import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SUPPORTED_INSTALL_TARGETS = ["opencode", "claude", "codex"] as const;
export type InstallTarget = (typeof SUPPORTED_INSTALL_TARGETS)[number];

export interface InstallOptions {
  project?: string;
  packageRoot?: string;
  agentHooks?: boolean;
}

interface SourcePaths {
  plugin: string;
  marketplace: string;
  hooks: string;
}

const GENERATED_MARKER = ".monkeybars-generated.json";

function moduleDirectory(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function packageRoot(): string {
  const fromModule = moduleDirectory();
  const candidates = [resolve(fromModule, ".."), resolve(fromModule, "..", ".."), process.cwd()];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "plugins", "monkeybars"))) {
      return candidate;
    }
  }

  return resolve(fromModule, "..");
}

function sourcePaths(rootOption?: string): SourcePaths {
  const root = resolve(rootOption ?? packageRoot());
  return {
    plugin: join(root, "plugins", "monkeybars"),
    marketplace: join(root, ".agents", "plugins", "marketplace.json"),
    hooks: join(root, "plugins", "monkeybars", "hooks")
  };
}

function projectRootOrThrow(projectPath?: string): string {
  const project = resolve(projectPath ?? process.cwd());
  if (!existsSync(project)) {
    throw new Error(`Project path does not exist: ${project}`);
  }

  const projectStat = statSync(project);
  if (!projectStat.isDirectory()) {
    throw new Error(`Project path is not a directory: ${project}`);
  }

  return project;
}

function samePath(left: string, right: string): boolean {
  return resolve(left) === resolve(right);
}

function isInsidePath(parent: string, child: string): boolean {
  const relativePath = relative(resolve(parent), resolve(child));
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

function replaceDirectory(source: string, target: string): void {
  const sourcePath = resolve(source);
  const targetPath = resolve(target);

  if (samePath(sourcePath, targetPath)) {
    throw new Error(`Refusing to copy directory onto itself: ${sourcePath}`);
  }

  if (isInsidePath(sourcePath, targetPath)) {
    throw new Error(`Refusing to copy directory into itself: ${sourcePath} -> ${targetPath}`);
  }

  const sourceStat = statSync(sourcePath);
  if (!sourceStat.isDirectory()) {
    throw new Error(`Source is not a directory: ${sourcePath}`);
  }

  rmSync(targetPath, { recursive: true, force: true });
  mkdirSync(targetPath, { recursive: true });

  for (const entry of readdirSync(sourcePath)) {
    const sourceEntry = join(sourcePath, entry);
    const targetEntry = join(targetPath, entry);
    const entryStat = statSync(sourceEntry);

    if (entryStat.isDirectory()) {
      replaceDirectory(sourceEntry, targetEntry);
      continue;
    }

    if (entryStat.isFile()) {
      mkdirSync(join(targetEntry, ".."), { recursive: true });
      copyFileSync(sourceEntry, targetEntry);
      chmodSync(targetEntry, entryStat.mode);
    }
  }
}

function removePath(path: string): void {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

function copyFilePreservingMode(source: string, target: string): void {
  const sourceStat = statSync(source);
  if (!sourceStat.isFile()) {
    throw new Error(`Source is not a file: ${source}`);
  }
  mkdirSync(join(target, ".."), { recursive: true });
  copyFileSync(source, target);
  chmodSync(target, sourceStat.mode);
}

function copyDirectoryInto(source: string, target: string): void {
  const sourcePath = resolve(source);
  const targetPath = resolve(target);
  if (samePath(sourcePath, targetPath)) return;
  if (isInsidePath(sourcePath, targetPath)) {
    throw new Error(`Refusing to copy directory into itself: ${sourcePath} -> ${targetPath}`);
  }

  removePath(targetPath);
  mkdirSync(targetPath, { recursive: true });
  for (const entry of readdirSync(sourcePath)) {
    const sourceEntry = join(sourcePath, entry);
    const targetEntry = join(targetPath, entry);
    const entryStat = statSync(sourceEntry);
    if (entryStat.isDirectory()) {
      copyDirectoryInto(sourceEntry, targetEntry);
    } else if (entryStat.isFile()) {
      copyFilePreservingMode(sourceEntry, targetEntry);
    }
  }
}

function copyHookFile(source: string, target: string): void {
  copyFilePreservingMode(source, target);
}

function warn(message: string): void {
  console.warn(`Warning: ${message}`);
}

function readMarkerEntries(target: string, key: "files" | "directories"): string[] {
  const marker = join(target, GENERATED_MARKER);
  if (!existsSync(marker)) return [];
  try {
    const parsed = JSON.parse(readFileSync(marker, "utf8"));
    const value = parsed?.[key];
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function writeInstallMarker(target: string, key: "files" | "directories", entries: string[]): void {
  mkdirSync(target, { recursive: true });
  writeFileSync(
    join(target, GENERATED_MARKER),
    `${JSON.stringify({ generatedBy: "monkeybars", installedBy: "monkeybars", [key]: entries.sort() }, null, 2)}\n`
  );
}

function sourceFiles(source: string): string[] {
  return readdirSync(source)
    .filter((name) => statSync(join(source, name)).isFile() && name !== GENERATED_MARKER)
    .sort();
}

function sourceDirectories(source: string): string[] {
  return readdirSync(source)
    .filter((name) => statSync(join(source, name)).isDirectory())
    .sort();
}

function installOpenCode(project: string, source: SourcePaths): string {
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

function installClaude(project: string, source: SourcePaths): string {
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

function installCodex(project: string, source: SourcePaths): { plugin: string; marketplace: string } {
  const pluginTarget = join(project, ".codex", "plugins", "monkeybars");
  const legacyPluginTarget = join(project, "plugins", "monkeybars");
  const marketplaceTarget = join(project, ".agents", "plugins", "marketplace.json");

  if (!existsSync(source.marketplace)) {
    throw new Error(`Missing marketplace metadata: ${source.marketplace}`);
  }

  if (!samePath(source.plugin, pluginTarget)) {
    replaceDirectory(source.plugin, pluginTarget);
  }

  if (!samePath(source.plugin, legacyPluginTarget) && looksLikeMonkeyBarsPlugin(legacyPluginTarget)) {
    removePath(legacyPluginTarget);
  }

  mkdirSync(join(marketplaceTarget, ".."), { recursive: true });
  if (!samePath(source.marketplace, marketplaceTarget)) {
    copyFileSync(source.marketplace, marketplaceTarget);
  }

  return { plugin: pluginTarget, marketplace: marketplaceTarget };
}

function looksLikeMonkeyBarsPlugin(path: string): boolean {
  const manifest = join(path, ".codex-plugin", "plugin.json");
  if (!existsSync(manifest)) return false;
  try {
    const parsed = JSON.parse(readFileSync(manifest, "utf8"));
    return parsed?.name === "monkeybars";
  } catch {
    return false;
  }
}

function readJsonObject(path: string, label: string): Record<string, unknown> | undefined {
  if (!existsSync(path)) return {};
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      warn(`Skipped MonkeyBars ${label} hooks because ${path} is not a JSON object.`);
      return undefined;
    }
    return value as Record<string, unknown>;
  } catch (error) {
    warn(
      `Skipped MonkeyBars ${label} hooks because ${path} could not be parsed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
}

function writeJsonObject(path: string, value: Record<string, unknown>): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function hookRoot(settings: Record<string, unknown>): Record<string, unknown> {
  if (!settings.hooks || typeof settings.hooks !== "object" || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }
  return settings.hooks as Record<string, unknown>;
}

function isMonkeyBarsCommandHook(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    "command" in value &&
    typeof (value as { command?: unknown }).command === "string" &&
    (value as { command: string }).command.includes("monkeybars-workflow-context.js")
  );
}

function removeMonkeyBarsHooks(settings: Record<string, unknown>): void {
  const hooks = hookRoot(settings);
  for (const event of Object.keys(hooks)) {
    const groups = Array.isArray(hooks[event]) ? (hooks[event] as unknown[]) : [];
    const nextGroups = groups
      .map((group) => {
        if (!group || typeof group !== "object" || Array.isArray(group)) return group;
        const hookGroup = group as Record<string, unknown>;
        const handlers = Array.isArray(hookGroup.hooks) ? hookGroup.hooks : [];
        return {
          ...hookGroup,
          hooks: handlers.filter((handler) => !isMonkeyBarsCommandHook(handler))
        };
      })
      .filter((group) => {
        if (!group || typeof group !== "object" || Array.isArray(group)) return true;
        const handlers = (group as Record<string, unknown>).hooks;
        return !Array.isArray(handlers) || handlers.length > 0;
      });

    if (nextGroups.length === 0) {
      delete hooks[event];
    } else {
      hooks[event] = nextGroups;
    }
  }
}

function addCommandHook(
  settings: Record<string, unknown>,
  event: string,
  command: string,
  options: { matcher?: string; statusMessage?: string } = {}
): void {
  const hooks = hookRoot(settings);
  const groups = Array.isArray(hooks[event]) ? (hooks[event] as unknown[]) : [];
  const handler: Record<string, unknown> = {
    type: "command",
    command,
    timeout: 5
  };
  if (options.statusMessage) handler.statusMessage = options.statusMessage;

  const group: Record<string, unknown> = {
    hooks: [handler]
  };
  if (options.matcher) group.matcher = options.matcher;

  hooks[event] = [...groups, group];
}

function installOpenCodeAgentHooks(project: string, source: SourcePaths): void {
  const target = join(project, ".opencode", "plugins", "monkeybars-workflow.js");
  copyHookFile(join(source.hooks, "opencode", "monkeybars-workflow.js"), target);
  console.log(`Installed MonkeyBars OpenCode workflow hooks to ${target}.`);
}

function installClaudeAgentHooks(project: string, source: SourcePaths): void {
  const settingsPath = join(project, ".claude", "settings.json");
  const settings = readJsonObject(settingsPath, "Claude");
  if (!settings) return;

  const target = join(project, ".claude", "hooks", "monkeybars-workflow-context.js");
  copyHookFile(join(source.hooks, "shared", "monkeybars-workflow-context.js"), target);

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

function installCodexAgentHooks(project: string, source: SourcePaths): void {
  const hooksPath = join(project, ".codex", "hooks.json");
  const configPath = join(project, ".codex", "config.toml");
  const settings = readJsonObject(hooksPath, "Codex");
  if (!settings) return;
  if (!updateCodexConfig(configPath)) return;

  const target = join(project, ".codex", "hooks", "monkeybars-workflow-context.js");
  copyHookFile(join(source.hooks, "shared", "monkeybars-workflow-context.js"), target);

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

export function normalizeInstallTargets(targets: readonly InstallTarget[] | undefined): InstallTarget[] {
  const selected = targets?.length ? targets : SUPPORTED_INSTALL_TARGETS;
  return [...new Set(selected)];
}

export function installPackageTargets(targets: readonly InstallTarget[] = [], options: InstallOptions = {}): void {
  const source = sourcePaths(options.packageRoot);
  const project = projectRootOrThrow(options.project);
  const installHooks = options.agentHooks ?? true;

  if (!existsSync(source.plugin)) {
    throw new Error(`Missing plugin source directory: ${source.plugin}`);
  }

  if (installHooks && !existsSync(source.hooks)) {
    throw new Error(`Missing hook source directory: ${source.hooks}`);
  }

  for (const target of normalizeInstallTargets(targets)) {
    runInstallTarget(target, source, project, installHooks);
  }
}

export function installPackageTarget(target: InstallTarget, options: InstallOptions = {}): void {
  installPackageTargets([target], options);
}

export function __installSourcePathForTest(): string {
  return sourcePaths().plugin;
}
