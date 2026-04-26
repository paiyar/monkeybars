import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gitHooksDir } from "./git.js";
import { extractPreflightCommands } from "./markdown.js";
import { printCheckResult, runCheck } from "./check.js";
import type { HookInstallOptions } from "./types.js";

const MANAGED_MARKER = "agent-workflow managed hook";
export const SUPPORTED_HOOKS = ["pre-commit", "post-commit", "pre-push"] as const;
export type SupportedHook = (typeof SUPPORTED_HOOKS)[number];

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function currentCliPath(): string {
  return process.argv[1] ? resolve(process.argv[1]) : fileURLToPath(import.meta.url);
}

function hookScript(hookName: SupportedHook, cliPath: string): string {
  return [
    "#!/bin/sh",
    `# ${MANAGED_MARKER}`,
    `exec bun ${shellQuote(cliPath)} hooks run ${hookName} "$@"`,
    ""
  ].join("\n");
}

function hooksDirOrThrow(cwd: string): string {
  const hooksDir = gitHooksDir(cwd);
  if (!hooksDir) {
    throw new Error("Not inside a git repository; cannot locate .git/hooks.");
  }
  return resolve(cwd, hooksDir);
}

export function installHooks(options: HookInstallOptions = {}): void {
  const cwd = options.cwd ?? process.cwd();
  const hooksDir = hooksDirOrThrow(cwd);
  const cliPath = options.cliPath ?? currentCliPath();
  mkdirSync(hooksDir, { recursive: true });

  for (const hookName of SUPPORTED_HOOKS) {
    const path = resolve(hooksDir, hookName);
    if (existsSync(path)) {
      const existing = readFileSync(path, "utf8");
      if (!existing.includes(MANAGED_MARKER) && !options.force) {
        throw new Error(`Refusing to overwrite existing ${hookName}; rerun with --force.`);
      }
    }
    writeFileSync(path, hookScript(hookName, cliPath), { mode: 0o755 });
    chmodSync(path, 0o755);
  }

  console.log(`Installed Agent Workflow hooks in ${hooksDir}.`);
}

export function uninstallHooks(cwd = process.cwd()): void {
  const hooksDir = hooksDirOrThrow(cwd);
  let removed = 0;
  for (const hookName of SUPPORTED_HOOKS) {
    const path = resolve(hooksDir, hookName);
    if (!existsSync(path)) continue;
    const existing = readFileSync(path, "utf8");
    if (!existing.includes(MANAGED_MARKER)) continue;
    rmSync(path);
    removed += 1;
  }
  console.log(`Removed ${removed} Agent Workflow hook(s).`);
}

function printPreflightReminder(cwd: string): void {
  const agentsPath = resolve(cwd, "AGENTS.md");
  if (!existsSync(agentsPath)) return;

  const commands = extractPreflightCommands(readFileSync(agentsPath, "utf8"));
  if (commands.length === 0) return;

  console.log("Project preflight checks documented in AGENTS.md:");
  for (const command of commands) {
    console.log(`  ${command}`);
  }
}

export function runHook(hookName: string, cwd = process.cwd()): number {
  if (!SUPPORTED_HOOKS.includes(hookName as SupportedHook)) {
    console.error(`Unsupported hook: ${hookName}`);
    return 2;
  }

  if (hookName === "post-commit") {
    console.log("Agent Workflow: commit recorded. Consider running /context-boundary before continuing.");
    return 0;
  }

  const result = runCheck(cwd);
  printCheckResult(result);
  if (!result.ok) return 1;

  if (hookName === "pre-push") {
    printPreflightReminder(cwd);
  }

  return 0;
}

export function __hookScriptForTest(hookName: SupportedHook, cliPath: string): string {
  return hookScript(hookName, cliPath);
}

export function __managedMarkerForTest(): string {
  return MANAGED_MARKER;
}
