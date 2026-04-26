#!/usr/bin/env bun
import { generateAdapters } from "./generator";

try {
  const pluginPath = generateAdapters();
  console.log(`Generated adapters into ${pluginPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
