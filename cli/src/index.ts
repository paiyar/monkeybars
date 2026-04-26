#!/usr/bin/env bun
import { Argument, Command, CommanderError } from "commander";
import { installHooks, runHook, SUPPORTED_HOOKS, uninstallHooks } from "./hooks.js";
import { printCheckResult, runCheck } from "./check.js";
import { installPackageTargets, SUPPORTED_INSTALL_TARGETS } from "./install.js";

type CheckOptions = {
  json?: boolean;
};

type PackageInstallOptions = {
  project?: string;
};

type HookInstallOptions = {
  force?: boolean;
};

function createProgram(): Command {
  const program = new Command();
  program
    .name("monkeybars")
    .exitOverride()
    .allowExcessArguments(false)
    .allowUnknownOption(false);

  program
    .command("check")
    .description("Check MonkeyBars status consistency.")
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

  program
    .command("install")
    .description("Install MonkeyBars workflow assets into a project.")
    .addArgument(new Argument("[targets...]", "install targets").choices(SUPPORTED_INSTALL_TARGETS))
    .option("--project <path>", "target project directory")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((targets: string[] = [], options: PackageInstallOptions) => {
      installPackageTargets(targets as (typeof SUPPORTED_INSTALL_TARGETS)[number][], {
        project: options.project
      });
      process.exitCode = 0;
    });

  const hooks = program
    .command("hooks")
    .description("Manage MonkeyBars git hooks.")
    .allowExcessArguments(false)
    .allowUnknownOption(false);

  hooks
    .command("install")
    .description("Install MonkeyBars git hooks.")
    .option("--force", "overwrite existing non-managed hooks")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((options: HookInstallOptions) => {
      installHooks({ force: options.force });
      process.exitCode = 0;
    });

  hooks
    .command("uninstall")
    .description("Uninstall managed MonkeyBars git hooks.")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action(() => {
      uninstallHooks();
      process.exitCode = 0;
    });

  hooks
    .command("run")
    .description("Run a MonkeyBars git hook.")
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
