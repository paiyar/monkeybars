#!/usr/bin/env bun
import { checkGeneratedAdapters, generateAdapters } from "./generator";

try {
  if (process.argv.includes("--check")) {
    const result = checkGeneratedAdapters();
    if (result.ok) {
      console.log("Generated adapters are up to date.");
    } else {
      for (const difference of result.differences) console.log(`STALE ${difference}`);
      process.exitCode = 1;
    }
  } else {
    const pluginPath = generateAdapters();
    console.log(`Generated adapters into ${pluginPath}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
