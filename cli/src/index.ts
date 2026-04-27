#!/usr/bin/env bun
import { Argument, Command, CommanderError } from "commander";
import { printCheckResult, runCheck } from "./check.js";
import { installPackageTargets, SUPPORTED_INSTALL_TARGETS } from "./install.js";

type CheckOptions = {
  json?: boolean;
};

type PackageInstallOptions = {
  project?: string;
  agentHooks?: boolean;
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
    .option("--no-agent-hooks", "skip agent-native workflow hook installation")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((targets: string[] = [], options: PackageInstallOptions) => {
      installPackageTargets(targets as (typeof SUPPORTED_INSTALL_TARGETS)[number][], {
        project: options.project,
        agentHooks: options.agentHooks
      });
      process.exitCode = 0;
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
