import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SourcePaths } from "./types.js";

function moduleDirectory(): string {
  return dirname(fileURLToPath(import.meta.url));
}

export function packageRoot(): string {
  const fromModule = moduleDirectory();
  const candidates = [resolve(fromModule, ".."), resolve(fromModule, "..", ".."), resolve(fromModule, "..", "..", ".."), process.cwd()];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "plugins", "monkeybars"))) {
      return candidate;
    }
  }

  return resolve(fromModule, "..");
}

export function sourcePaths(rootOption?: string): SourcePaths {
  const root = resolve(rootOption ?? packageRoot());
  return {
    plugin: join(root, "plugins", "monkeybars"),
    marketplace: join(root, ".agents", "plugins", "marketplace.json"),
    hooks: join(root, "plugins", "monkeybars", "hooks")
  };
}

export function projectRootOrThrow(projectPath?: string): string {
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
