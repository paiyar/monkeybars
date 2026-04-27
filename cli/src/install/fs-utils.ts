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
import { isAbsolute, join, relative, resolve } from "node:path";

const GENERATED_MARKER = ".monkeybars-generated.json";

export function samePath(left: string, right: string): boolean {
  return resolve(left) === resolve(right);
}

export function isInsidePath(parent: string, child: string): boolean {
  const relativePath = relative(resolve(parent), resolve(child));
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

export function replaceDirectory(source: string, target: string): void {
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

export function removePath(path: string): void {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

export function copyFilePreservingMode(source: string, target: string): void {
  const sourceStat = statSync(source);
  if (!sourceStat.isFile()) {
    throw new Error(`Source is not a file: ${source}`);
  }
  mkdirSync(join(target, ".."), { recursive: true });
  copyFileSync(source, target);
  chmodSync(target, sourceStat.mode);
}

export function copyDirectoryInto(source: string, target: string): void {
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

export function readMarkerEntries(target: string, key: "files" | "directories"): string[] {
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

export function writeInstallMarker(target: string, key: "files" | "directories", entries: string[]): void {
  mkdirSync(target, { recursive: true });
  writeFileSync(
    join(target, GENERATED_MARKER),
    `${JSON.stringify({ generatedBy: "monkeybars", installedBy: "monkeybars", [key]: entries.sort() }, null, 2)}\n`
  );
}

export function sourceFiles(source: string): string[] {
  return readdirSync(source)
    .filter((name) => statSync(join(source, name)).isFile() && name !== GENERATED_MARKER)
    .sort();
}

export function sourceDirectories(source: string): string[] {
  return readdirSync(source)
    .filter((name) => statSync(join(source, name)).isDirectory())
    .sort();
}
