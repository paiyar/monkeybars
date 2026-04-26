import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseFrontmatter } from "../cli/src/generator";

const root = join(import.meta.dir, "..");

function readWorkflow(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("brainstorm-plan workflow content", () => {
  test("includes planning templates in generated adapters", () => {
    const { meta } = parseFrontmatter(join(root, "workflow-src", "commands", "brainstorm-plan.md"));

    expect(meta.name).toBe("brainstorm-plan");
    expect(meta.include_templates).toBe("spec, architecture, data-model, api, plan");
  });

  test("keeps the required brainstorming gates", () => {
    const command = readWorkflow("workflow-src/commands/brainstorm-plan.md");

    expect(command).toContain("Explore project context before asking questions");
    expect(command).toContain("Existing-doc synthesis");
    expect(command).toContain("Guided intake");
    expect(command).toContain("Ask one high-impact clarifying question at a time");
    expect(command).toContain("present 2-3 viable approaches");
    expect(command).toContain("get user approval before\n   writing files");
    expect(command).toContain("Run a planning self-review");
    expect(command).toContain("hand\n   off to `create-phase`");
  });

  test("initialization supports discovered docs and guided intake", () => {
    const initialize = readWorkflow("workflow-src/commands/initialize-agent-workflow.md");

    expect(initialize).toContain("Bring-your-own-docs path");
    expect(initialize).toContain("Guided initialization path");
    expect(initialize).toContain("optional companion docs under `docs/prd/`");
  });

  test("routes unclear planning state back through brainstorm-plan", () => {
    const initialize = readWorkflow("workflow-src/commands/initialize-agent-workflow.md");
    const createPhase = readWorkflow("workflow-src/commands/create-phase.md");
    const startSession = readWorkflow("workflow-src/commands/start-session.md");

    expect(initialize).toMatch(/run\s+`brainstorm-plan`\s+before creating/);
    expect(createPhase).toContain("stop and recommend\n   `brainstorm-plan`");
    expect(startSession).toContain("recommend `brainstorm-plan` before changing");
  });
});
