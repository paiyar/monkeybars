import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  readFileSync
} from "node:fs";
import { join, relative, resolve } from "node:path";

export interface FrontmatterResult {
  meta: Record<string, string>;
  body: string;
}

export interface GenerateOptions {
  root?: string;
}

interface Paths {
  root: string;
  source: string;
  plugin: string;
  commandSource: string;
  templateSource: string;
  cliDist: string;
}

function paths(rootOption?: string): Paths {
  const root = resolve(rootOption ?? join(import.meta.dir, "..", ".."));
  const source = join(root, "workflow-src");
  return {
    root,
    source,
    plugin: join(root, "plugins", "agent-workflow"),
    commandSource: join(source, "commands"),
    templateSource: join(source, "templates"),
    cliDist: join(root, "dist")
  };
}

function sortedMarkdownFiles(directory: string): string[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => join(directory, name));
}

function resetDir(path: string): void {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
  mkdirSync(path, { recursive: true });
}

export function parseFrontmatter(path: string): FrontmatterResult {
  const text = readFileSync(path, "utf8");
  if (!text.startsWith("---\n")) {
    throw new Error(`${path} is missing YAML-style frontmatter`);
  }

  const end = text.indexOf("---\n", 4);
  if (end === -1) {
    throw new Error(`${path} is missing closing frontmatter delimiter`);
  }

  const rawMeta = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\s+/, "");
  const meta: Record<string, string> = {};

  for (const line of rawMeta.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator === -1) {
      throw new Error(`Invalid frontmatter line in ${path}: ${line}`);
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!key) {
      throw new Error(`Invalid frontmatter line in ${path}: ${line}`);
    }
    meta[key] = value;
  }

  if (!meta.name || !meta.description) {
    throw new Error(`${path} must define name and description`);
  }

  return { meta, body };
}

export function renderSkill(meta: Record<string, string>, body: string): string {
  return [
    "---",
    `name: ${meta.name}`,
    `description: ${meta.description}`,
    "disable-model-invocation: true",
    "---",
    "",
    body
  ].join("\n");
}

export function renderOpenCodeCommand(meta: Record<string, string>, body: string): string {
  const lines = ["---", `description: ${meta.description}`];
  if (meta.opencode_agent) {
    lines.push(`agent: ${meta.opencode_agent}`);
  }
  lines.push("---", "", body);
  return lines.join("\n");
}

function copyTemplates(allPaths: Paths): void {
  const target = join(allPaths.plugin, "templates");
  resetDir(target);
  for (const template of sortedMarkdownFiles(allPaths.templateSource)) {
    copyFileSync(template, join(target, template.split(/[\\/]/).at(-1) ?? ""));
  }
}

function copyCli(allPaths: Paths): void {
  if (!existsSync(allPaths.cliDist)) return;
  const target = join(allPaths.plugin, "bin");
  resetDir(target);

  const copyRecursive = (source: string): void => {
    for (const name of readdirSync(source)) {
      const sourcePath = join(source, name);
      const relativePath = relative(allPaths.cliDist, sourcePath);
      const destination = join(target, relativePath);
      const stat = statSync(sourcePath);
      if (stat.isDirectory()) {
        mkdirSync(destination, { recursive: true });
        copyRecursive(sourcePath);
        continue;
      }
      mkdirSync(join(destination, ".."), { recursive: true });
      copyFileSync(sourcePath, destination);
      chmodSync(destination, stat.mode);
    }
  };

  copyRecursive(allPaths.cliDist);
}

export function generateAdapters(options: GenerateOptions = {}): string {
  const allPaths = paths(options.root);
  const skillsDir = join(allPaths.plugin, "skills");
  const commandsDir = join(allPaths.plugin, "commands");
  resetDir(skillsDir);
  resetDir(commandsDir);

  for (const sourceFile of sortedMarkdownFiles(allPaths.commandSource)) {
    const { meta, body } = parseFrontmatter(sourceFile);
    const name = meta.name;

    const skillDir = join(skillsDir, name);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), renderSkill(meta, body));

    writeFileSync(join(commandsDir, `${name}.md`), renderOpenCodeCommand(meta, body));
  }

  copyTemplates(allPaths);
  copyCli(allPaths);
  return allPaths.plugin;
}
