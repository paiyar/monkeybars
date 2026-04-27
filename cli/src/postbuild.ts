import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const distIndex = resolve(join("dist", "index.js"));

if (!existsSync(distIndex)) {
  throw new Error("dist/index.js does not exist; run bun build first.");
}

const text = readFileSync(distIndex, "utf8");
const withoutShebang = text.replace(/^#!.*\n/, "");
writeFileSync(distIndex, `#!/usr/bin/env node\n${withoutShebang}`);
chmodSync(distIndex, 0o755);
