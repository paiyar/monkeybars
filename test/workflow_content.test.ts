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
    const initialize = readWorkflow("workflow-src/commands/initialize-monkeybars.md");

    expect(initialize).toContain("Greenfield path");
    expect(initialize).toContain("Brownfield adoption path");
    expect(initialize).toContain("Bring-your-own-docs path");
    expect(initialize).toContain("Next-release path");
    expect(initialize).toContain("Guided initialization path");
    expect(initialize).toContain("optional companion docs under `docs/prd/`");
  });

  test("routes unclear planning state back through brainstorm-plan", () => {
    const initialize = readWorkflow("workflow-src/commands/initialize-monkeybars.md");
    const createPhase = readWorkflow("workflow-src/commands/create-phase.md");
    const startSession = readWorkflow("workflow-src/commands/start-session.md");

    expect(initialize).toMatch(/run\s+`brainstorm-plan`\s+before creating/);
    expect(createPhase).toContain("stop and recommend\n   `brainstorm-plan`");
    expect(startSession).toContain("recommend `brainstorm-plan` before changing");
  });

  test("README positions workflow beyond greenfield projects", () => {
    const readme = readWorkflow("README.md");

    expect(readme).toContain("greenfield builds, brownfield rescue, and v2/v3 iteration");
    expect(readme).toContain("### Brownfield Rescue");
    expect(readme).toContain("### Post-v1 Or Next Release");
    expect(readme).not.toContain("myopically built for greenfield");
  });

  test("commands describe brownfield adoption and post-v1 plan rollover", () => {
    const brainstorm = readWorkflow("workflow-src/commands/brainstorm-plan.md");
    const createPhase = readWorkflow("workflow-src/commands/create-phase.md");
    const workflowCheck = readWorkflow("workflow-src/commands/workflow-check.md");

    expect(brainstorm).toContain("Brownfield synthesis");
    expect(brainstorm).toContain("Next-release planning");
    expect(brainstorm).toContain("docs/archive/plans/YYYY-MM-DD-<scope>.md");
    expect(createPhase).toContain("keep phase\nnumbers increasing across the repo");
    expect(createPhase).toContain("highest existing phase number");
    expect(workflowCheck).toContain("phase numbers are monotonic");
  });

  test("templates encode active plan lifecycle and current vs target state", () => {
    const plan = readWorkflow("workflow-src/templates/plan.md");
    const status = readWorkflow("workflow-src/templates/status.md");
    const spec = readWorkflow("workflow-src/templates/spec.md");
    const architecture = readWorkflow("workflow-src/templates/architecture.md");

    expect(plan).toContain("## Plan Scope");
    expect(plan).toContain("docs/archive/plans/YYYY-MM-DD-<scope>.md");
    expect(status).toContain("**Plan scope:**");
    expect(spec).toContain("## Current State");
    expect(spec).toContain("## Target Outcome");
    expect(architecture).toContain("## Current Architecture");
    expect(architecture).toContain("## Target Architecture");
  });

  test("install docs cover global and per-repo setup for each tool", () => {
    const readme = readWorkflow("README.md");
    const pluginReadme = readWorkflow("plugins/monkeybars/README.md");

    for (const docs of [readme, pluginReadme]) {
      expect(docs).toContain("OPENCODE_COMMANDS_DIR=/path/to/repo/.opencode/commands");
      expect(docs).toContain("CLAUDE_SKILLS_DIR=/path/to/repo/.claude/skills");
      expect(docs).toContain("plugins/monkeybars/.codex-plugin/plugin.json");
      expect(docs).toContain(".agents/plugins/marketplace.json");
      expect(docs).toContain("$initialize-monkeybars");
    }

    expect(readme).not.toContain("Codex can invoke automatically");
  });

  test("Codex plugin metadata reflects full workflow fit", () => {
    const manifest = readWorkflow("plugins/monkeybars/.codex-plugin/plugin.json");

    expect(manifest).toContain("brownfield rescue");
    expect(manifest).toContain("post-v1 iteration");
    expect(manifest).not.toContain("build greenfield projects from specs");
  });

  test("Claude installer copies complete skill directories", () => {
    const script = readWorkflow("plugins/monkeybars/scripts/install-claude-skills.sh");

    expect(script).toContain('rm -rf "$TARGET_DIR/$skill_name"');
    expect(script).toContain('cp -R "$skill_dir" "$TARGET_DIR/$skill_name"');
    expect(script).not.toContain('cp "$skill_dir"/SKILL.md');
  });
});
