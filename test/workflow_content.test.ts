import { describe, expect, test } from "bun:test";

import { sourceText } from "./helpers";

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function expectContent(text: string, expected: string): void {
  expect(normalizeText(text)).toContain(normalizeText(expected));
}

function expectContents(text: string, expected: string[]): void {
  for (const item of expected) {
    expectContent(text, item);
  }
}

function commandText(name: string): string {
  return sourceText(`monkeybars/commands/${name}.md`);
}

describe("shipped workflow content", () => {
  test("brainstorm-plan adapters include planning templates", () => {
    const command = commandText("brainstorm-plan");
    const skill = sourceText("monkeybars/skills/brainstorm-plan/SKILL.md");

    for (const output of [command, skill]) {
      expect(output).toContain("## Included Templates");
      for (const template of ["spec", "architecture", "data-model", "api", "plan"]) {
        expect(output).toContain(`### \`templates/${template}.md\``);
      }
    }
  });

  test("keeps the required brainstorming gates", () => {
    const command = commandText("brainstorm-plan");

    expectContents(command, [
      "Explore project context before asking questions",
      "Existing-doc synthesis",
      "Guided intake",
      "Ask one high-impact clarifying question at a time",
      "present 2-3 viable approaches",
      "get user approval before writing files",
      "Run a planning self-review",
      "hand off to `create-phase`"
    ]);
  });

  test("initialization supports discovered docs and guided intake", () => {
    const initialize = commandText("initialize-monkeybars");

    expectContents(initialize, [
      "Greenfield path",
      "Brownfield adoption path",
      "Bring-your-own-docs path",
      "Next-release path",
      "Guided initialization path",
      "optional companion docs under `docs/prd/`"
    ]);
  });

  test("routes unclear planning state back through brainstorm-plan", () => {
    const initialize = commandText("initialize-monkeybars");
    const createPhase = commandText("create-phase");
    const startSession = commandText("start-session");

    expect(initialize).toMatch(/run\s+`brainstorm-plan`\s+before creating/);
    expectContent(createPhase, "stop and recommend `brainstorm-plan`");
    expectContent(startSession, "recommend `brainstorm-plan` before changing");
  });

  test("commands describe brownfield adoption and post-v1 plan rollover", () => {
    const brainstorm = commandText("brainstorm-plan");
    const createPhase = commandText("create-phase");
    const workflowCheck = commandText("workflow-check");

    expectContents(brainstorm, [
      "Brownfield synthesis",
      "Next-release planning",
      "docs/archive/plans/YYYY-MM-DD-<scope>.md"
    ]);
    expectContents(createPhase, ["keep phase numbers increasing across the repo", "highest existing phase number"]);
    expectContent(workflowCheck, "phase numbers are monotonic");
  });

  test("templates encode active plan lifecycle and current vs target state", () => {
    const plan = sourceText("monkeybars/templates/plan.md");
    const status = sourceText("monkeybars/templates/status.md");
    const spec = sourceText("monkeybars/templates/spec.md");
    const architecture = sourceText("monkeybars/templates/architecture.md");

    expect(plan).toContain("## Plan Scope");
    expect(plan).toContain("docs/archive/plans/YYYY-MM-DD-<scope>.md");
    expect(status).toContain("**Plan scope:**");
    expect(spec).toContain("## Current State");
    expect(spec).toContain("## Target Outcome");
    expect(architecture).toContain("## Current Architecture");
    expect(architecture).toContain("## Target Architecture");
  });

  test("Codex plugin metadata reflects full workflow fit", () => {
    const manifest = sourceText("monkeybars/.codex-plugin/plugin.json");

    expect(manifest).toContain("brownfield rescue");
    expect(manifest).toContain("post-v1 iteration");
    expect(manifest).not.toContain("build greenfield projects from specs");
  });

  test("Claude installer copies complete skill directories", () => {
    const script = sourceText("monkeybars/scripts/install-claude-skills.sh");

    expect(script).toContain('rm -rf "$TARGET_DIR/$skill_name"');
    expect(script).toContain('cp -R "$skill_dir" "$TARGET_DIR/$skill_name"');
    expect(script).not.toContain('cp "$skill_dir"/SKILL.md');
  });
});
