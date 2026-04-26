#!/usr/bin/env bun
import { Argument, Command, CommanderError } from "commander";
import { installHooks, runHook, SUPPORTED_HOOKS, uninstallHooks } from "./hooks.js";
import { printCheckResult, runCheck } from "./check.js";

type CheckOptions = {
  json?: boolean;
};

type InstallOptions = {
  force?: boolean;
};

function createProgram(): Command {
  const program = new Command();
  program
    .name("agent-workflow")
    .exitOverride()
    .allowExcessArguments(false)
    .allowUnknownOption(false);

  program
    .command("check")
    .description("Check Agent Workflow status consistency.")
    .option("--json", "emit JSON")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((options: CheckOptions) => {
      const result = runCheck();
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printCheckResult(result);
      }
      process.exitCode = result.ok ? 0 : 1;
    });

  const hooks = program
    .command("hooks")
    .description("Manage Agent Workflow git hooks.")
    .allowExcessArguments(false)
    .allowUnknownOption(false);

  hooks
    .command("install")
    .description("Install Agent Workflow git hooks.")
    .option("--force", "overwrite existing non-managed hooks")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((options: InstallOptions) => {
      installHooks({ force: options.force });
      process.exitCode = 0;
    });

  hooks
    .command("uninstall")
    .description("Uninstall managed Agent Workflow git hooks.")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action(() => {
      uninstallHooks();
      process.exitCode = 0;
    });

  hooks
    .command("run")
    .description("Run an Agent Workflow git hook.")
    .addArgument(new Argument("<hook>", "hook name").choices(SUPPORTED_HOOKS))
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((hookName: string) => {
      process.exitCode = runHook(hookName);
    });

  return program;
}

export function main(argv: string[]): number {
  const program = createProgram();
  process.exitCode = 0;

  if (argv.length === 0) {
    program.outputHelp();
    return 0;
  }

  try {
    program.parse(argv, { from: "user" });
    return process.exitCode && process.exitCode !== 0 ? Number(process.exitCode) : 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.code === "commander.helpDisplayed" ? 0 : 2;
    }
    throw error;
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
