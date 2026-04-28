#!/usr/bin/env node
import { Argument, Command, CommanderError } from "commander";
import { printCheckResult, runCheck } from "./check.js";
import { checkGeneratedAdapters, generateAdapters } from "./generator.js";
import { installPackageTargets, SUPPORTED_INSTALL_TARGETS } from "./install/index.js";
import { STATUS_FILE } from "./paths.js";
import { advanceTask, doctor, health, migrateStatus, nextRecommendation, preflight, summarizeWorkflow } from "./workflow-state.js";

type CheckOptions = {
  json?: boolean;
};

type PackageInstallOptions = {
  project?: string;
  agentHooks?: boolean;
  dryRun?: boolean;
};

type GenerateOptions = {
  check?: boolean;
};

type StatusOptions = {
  json?: boolean;
};

type NextOptions = {
  json?: boolean;
};

type PreflightOptions = {
  dryRun?: boolean;
};

type HealthOptions = {
  json?: boolean;
  repair?: boolean;
};

type AdvanceOptions = {
  task: string;
  commit: string;
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
    .command("status")
    .description("Show current MonkeyBars workflow status.")
    .option("--json", "emit JSON")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((options: StatusOptions) => {
      const summary = summarizeWorkflow();
      if (options.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
      }
      if (!summary.initialized) {
        console.log("MonkeyBars is not initialized in this repository.");
        return;
      }
      console.log(`Phase: ${summary.phase ?? "unknown"}`);
      console.log(`State: ${summary.state ?? "unknown"}`);
      console.log(`Current task: ${summary.currentTask ?? "unknown"}`);
      console.log(`Tasks: ${summary.completedTasks} complete, ${summary.remainingTasks} remaining`);
      console.log(`Blockers: ${summary.blockers ?? "unknown"}`);
      console.log(`WIP files: ${summary.wipFiles ?? "unknown"}`);
    });

  program
    .command("next")
    .description("Recommend the next MonkeyBars workflow action from repo state.")
    .option("--json", "emit JSON")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((options: NextOptions) => {
      const recommendation = nextRecommendation();
      if (options.json) {
        console.log(JSON.stringify(recommendation, null, 2));
        return;
      }
      console.log(`Next: ${recommendation.command}`);
      console.log(`Reason: ${recommendation.reason}`);
      if (recommendation.phase) console.log(`Phase: ${recommendation.phase}`);
      if (recommendation.currentTask) console.log(`Current task: ${recommendation.currentTask}`);
      if (recommendation.state) console.log(`State: ${recommendation.state}`);
      console.log(`Dirty files: ${recommendation.dirtyFiles}`);
    });

  program
    .command("health")
    .description("Validate MonkeyBars workflow structure and setup health.")
    .option("--json", "emit JSON")
    .option("--repair", "perform conservative repairs")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((options: HealthOptions) => {
      const result = health(Boolean(options.repair));
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.findings.length === 0) {
          console.log("MonkeyBars health passed.");
        } else {
          for (const finding of result.findings) {
            const label = finding.severity === "error" ? "ERROR" : "WARN";
            const file = finding.file ? ` ${finding.file}` : "";
            const repairable = finding.repairable ? " repairable" : "";
            console.log(`${label} ${finding.code}${file}${repairable}: ${finding.message}`);
          }
        }
        for (const repair of result.repairs) console.log(`REPAIR ${repair}`);
      }
      process.exitCode = result.ok ? 0 : 1;
    });

  program
    .command("preflight")
    .description("Run documented project preflight checks.")
    .option("--dry-run", "print commands without running them")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((options: PreflightOptions) => {
      const result = preflight(Boolean(options.dryRun));
      if (result.commands.length === 0) {
        console.log("No preflight commands found in AGENTS.md.");
      } else if (result.dryRun) {
        for (const command of result.commands) console.log(command);
      }
      if (!result.ok) {
        console.error(`Preflight failed: ${result.failedCommand}`);
        process.exitCode = result.status ?? 1;
      }
    });

  program
    .command("advance")
    .description("Advance workflow tracking files after a completed task, before committing.")
    .requiredOption("--task <id>", "completed task id")
    .requiredOption("--commit <subject>", "commit subject to record")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((options: AdvanceOptions) => {
      const result = advanceTask(options.task, options.commit);
      console.log(
        `Advanced ${result.phaseFile}: completed ${result.completedTask}, next ${result.nextTask}, state ${result.state}.`
      );
    });

  program
    .command("migrate-status")
    .description(`Add or refresh the structured MonkeyBars status block in ${STATUS_FILE}.`)
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action(() => {
      const path = migrateStatus();
      console.log(`Migrated ${path}.`);
    });

  program
    .command("doctor")
    .description("Print MonkeyBars installation and repository diagnostics.")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action(() => {
      for (const line of doctor()) console.log(line);
    });

  program
    .command("generate")
    .description("Regenerate MonkeyBars adapter artifacts.")
    .option("--check", "fail if generated artifacts are stale without modifying files")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((options: GenerateOptions) => {
      if (options.check) {
        const result = checkGeneratedAdapters();
        if (result.ok) {
          console.log("Generated adapters are up to date.");
          return;
        }
        for (const difference of result.differences) console.log(`STALE ${difference}`);
        process.exitCode = 1;
        return;
      }
      const pluginPath = generateAdapters();
      console.log(`Generated adapters into ${pluginPath}`);
    });

  program
    .command("install")
    .description("Install MonkeyBars workflow assets into a project.")
    .addArgument(new Argument("[targets...]", "install targets").choices(SUPPORTED_INSTALL_TARGETS))
    .option("--project <path>", "target project directory")
    .option("--no-agent-hooks", "skip agent-native workflow hook installation")
    .option("--dry-run", "show what would be installed without writing files")
    .allowExcessArguments(false)
    .allowUnknownOption(false)
    .action((targets: string[] = [], options: PackageInstallOptions) => {
      installPackageTargets(targets as (typeof SUPPORTED_INSTALL_TARGETS)[number][], {
        project: options.project,
        agentHooks: options.agentHooks,
        dryRun: options.dryRun
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
