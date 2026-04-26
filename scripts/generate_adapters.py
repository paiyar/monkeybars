#!/usr/bin/env python3
"""Generate tool-specific agent workflow adapters from workflow-src."""

from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "workflow-src"
PLUGIN = ROOT / "plugins" / "agent-workflow"
COMMAND_SOURCE = SOURCE / "commands"
TEMPLATE_SOURCE = SOURCE / "templates"


def parse_frontmatter(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text()
    if not text.startswith("---\n"):
        raise ValueError(f"{path} is missing YAML-style frontmatter")
    _, raw_meta, body = text.split("---\n", 2)
    meta: dict[str, str] = {}
    for line in raw_meta.splitlines():
        if not line.strip():
            continue
        key, separator, value = line.partition(":")
        if not key or not separator:
            raise ValueError(f"Invalid frontmatter line in {path}: {line}")
        meta[key.strip()] = value.strip()
    if "name" not in meta or "description" not in meta:
        raise ValueError(f"{path} must define name and description")
    return meta, body.lstrip()


def reset_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True)


def render_skill(meta: dict[str, str], body: str) -> str:
    return (
        "---\n"
        f"name: {meta['name']}\n"
        f"description: {meta['description']}\n"
        "disable-model-invocation: true\n"
        "---\n\n"
        f"{body}"
    )


def render_opencode_command(meta: dict[str, str], body: str) -> str:
    lines = [
        "---",
        f"description: {meta['description']}",
    ]
    if agent := meta.get("opencode_agent"):
        lines.append(f"agent: {agent}")
    lines.extend(["---", "", body])
    return "\n".join(lines)


def copy_templates() -> None:
    target = PLUGIN / "templates"
    reset_dir(target)
    for template in sorted(TEMPLATE_SOURCE.glob("*.md")):
        shutil.copyfile(template, target / template.name)


def main() -> None:
    skills_dir = PLUGIN / "skills"
    commands_dir = PLUGIN / "commands"
    reset_dir(skills_dir)
    reset_dir(commands_dir)

    for source_file in sorted(COMMAND_SOURCE.glob("*.md")):
        meta, body = parse_frontmatter(source_file)
        name = meta["name"]

        skill_dir = skills_dir / name
        skill_dir.mkdir(parents=True)
        (skill_dir / "SKILL.md").write_text(render_skill(meta, body))

        (commands_dir / f"{name}.md").write_text(render_opencode_command(meta, body))

    copy_templates()
    print(f"Generated adapters into {PLUGIN}")


if __name__ == "__main__":
    main()
