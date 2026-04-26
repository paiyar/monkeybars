#!/usr/bin/env bun
import { installHooks, runHook, uninstallHooks } from "./hooks.js";
import { printCheckResult, runCheck } from "./check.js";

function printHelp(): void {
  console.log(`agent-workflow

Usage:
  agent-workflow check [--json]
  agent-workflow hooks install [--force]
  agent-workflow hooks uninstall
  agent-workflow hooks run <pre-commit|post-commit|pre-push>
`);
}

function main(argv: string[]): number {
  const [command, ...args] = argv;

  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return 0;
  }

  if (command === "check") {
    const result = runCheck();
    if (args.includes("--json")) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printCheckResult(result);
    }
    return result.ok ? 0 : 1;
  }

  if (command === "hooks") {
    const [subcommand, ...hookArgs] = args;
    if (subcommand === "install") {
      installHooks({ force: hookArgs.includes("--force") });
      return 0;
    }
    if (subcommand === "uninstall") {
      uninstallHooks();
      return 0;
    }
    if (subcommand === "run") {
      const [hookName] = hookArgs;
      return runHook(hookName ?? "");
    }
  }

  printHelp();
  return 2;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
