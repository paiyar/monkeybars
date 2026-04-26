import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync
} from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

export const SUPPORTED_INSTALL_TARGETS = ["opencode", "claude", "codex"] as const;
export type InstallTarget = (typeof SUPPORTED_INSTALL_TARGETS)[number];

export interface InstallOptions {
  project?: string;
  packageRoot?: string;
}

interface SourcePaths {
  plugin: string;
  marketplace: string;
}

function packageRoot(): string {
  const oneUp = resolve(import.meta.dir, "..");
  if (existsSync(join(oneUp, "plugins", "monkeybars"))) {
    return oneUp;
  }

  return resolve(import.meta.dir, "..", "..");
}

function sourcePaths(rootOption?: string): SourcePaths {
  const root = resolve(rootOption ?? packageRoot());
  return {
    plugin: join(root, "plugins", "monkeybars"),
    marketplace: join(root, ".agents", "plugins", "marketplace.json")
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

function installOpenCode(project: string, source: SourcePaths): string {
  const target = join(project, ".opencode", "commands");
  replaceDirectory(join(source.plugin, "commands"), target);
  return target;
}

function installClaude(project: string, source: SourcePaths): string {
  const target = join(project, ".claude", "skills");
  replaceDirectory(join(source.plugin, "skills"), target);
  return target;
}

function installCodex(project: string, source: SourcePaths): { plugin: string; marketplace: string } {
  const pluginTarget = join(project, "plugins", "monkeybars");
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

function runInstallTarget(target: InstallTarget, source: SourcePaths, project: string): void {
  switch (target) {
    case "opencode": {
      const targetPath = installOpenCode(project, source);
      console.log(`Installed MonkeyBars OpenCode commands to ${targetPath}.`);
      return;
    }
    case "claude": {
      const targetPath = installClaude(project, source);
      console.log(`Installed MonkeyBars Claude skills to ${targetPath}.`);
      return;
    }
    case "codex": {
      const targetPaths = installCodex(project, source);
      console.log(
        `Installed MonkeyBars Codex plugin to ${targetPaths.plugin} and marketplace metadata to ${targetPaths.marketplace}.`
      );
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

  if (!existsSync(source.plugin)) {
    throw new Error(`Missing plugin source directory: ${source.plugin}`);
  }

  for (const target of normalizeInstallTargets(targets)) {
    runInstallTarget(target, source, project);
  }
}

export function installPackageTarget(target: InstallTarget, options: InstallOptions = {}): void {
  installPackageTargets([target], options);
}

export function __installSourcePathForTest(): string {
  return sourcePaths().plugin;
}
