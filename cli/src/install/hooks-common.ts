import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function warn(message: string): void {
  console.warn(`Warning: ${message}`);
}

export function readJsonObject(path: string, label: string): Record<string, unknown> | undefined {
  if (!existsSync(path)) return {};
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      warn(`Skipped MonkeyBars ${label} hooks because ${path} is not a JSON object.`);
      return undefined;
    }
    return value as Record<string, unknown>;
  } catch (error) {
    warn(
      `Skipped MonkeyBars ${label} hooks because ${path} could not be parsed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
}

export function writeJsonObject(path: string, value: Record<string, unknown>): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function hookRoot(settings: Record<string, unknown>): Record<string, unknown> {
  if (!settings.hooks || typeof settings.hooks !== "object" || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }
  return settings.hooks as Record<string, unknown>;
}

export function isMonkeyBarsCommandHook(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    "command" in value &&
    typeof (value as { command?: unknown }).command === "string" &&
    (value as { command: string }).command.includes("monkeybars-workflow-context.js")
  );
}

export function removeMonkeyBarsHooks(settings: Record<string, unknown>): void {
  const hooks = hookRoot(settings);
  for (const event of Object.keys(hooks)) {
    const groups = Array.isArray(hooks[event]) ? (hooks[event] as unknown[]) : [];
    const nextGroups = groups
      .map((group) => {
        if (!group || typeof group !== "object" || Array.isArray(group)) return group;
        const hookGroup = group as Record<string, unknown>;
        const handlers = Array.isArray(hookGroup.hooks) ? hookGroup.hooks : [];
        return {
          ...hookGroup,
          hooks: handlers.filter((handler) => !isMonkeyBarsCommandHook(handler))
        };
      })
      .filter((group) => {
        if (!group || typeof group !== "object" || Array.isArray(group)) return true;
        const handlers = (group as Record<string, unknown>).hooks;
        return !Array.isArray(handlers) || handlers.length > 0;
      });

    if (nextGroups.length === 0) {
      delete hooks[event];
    } else {
      hooks[event] = nextGroups;
    }
  }
}

export function addCommandHook(
  settings: Record<string, unknown>,
  event: string,
  command: string,
  options: { matcher?: string; statusMessage?: string } = {}
): void {
  const hooks = hookRoot(settings);
  const groups = Array.isArray(hooks[event]) ? (hooks[event] as unknown[]) : [];
  const handler: Record<string, unknown> = {
    type: "command",
    command,
    timeout: 5
  };
  if (options.statusMessage) handler.statusMessage = options.statusMessage;

  const group: Record<string, unknown> = {
    hooks: [handler]
  };
  if (options.matcher) group.matcher = options.matcher;

  hooks[event] = [...groups, group];
}
