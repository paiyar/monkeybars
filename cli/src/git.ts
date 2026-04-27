import { execFileSync } from "node:child_process";

export function git(args: string[], cwd = process.cwd()): string | undefined {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error("git is not installed or not on PATH.");
    }
    return undefined;
  }
}

export function isGitAvailable(): boolean {
  try {
    git(["--version"]);
    return true;
  } catch {
    return false;
  }
}

export function gitVersion(): string | undefined {
  try {
    return git(["--version"]);
  } catch {
    return undefined;
  }
}

export function gitStatus(cwd = process.cwd()): string[] {
  const output = git(["status", "--short"], cwd);
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean);
}

export function recentCommits(cwd = process.cwd()): string[] {
  const output = git(["log", "--oneline", "-n", "100"], cwd);
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean);
}

export function recentCommitSubjects(cwd = process.cwd()): string[] {
  const output = git(["log", "--format=%s", "-n", "100"], cwd);
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean);
}

export function isGitRepository(cwd = process.cwd()): boolean {
  return git(["rev-parse", "--is-inside-work-tree"], cwd) === "true";
}

export function gitHooksDir(cwd = process.cwd()): string | undefined {
  return git(["rev-parse", "--git-path", "hooks"], cwd);
}
