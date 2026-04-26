#!/usr/bin/env sh
set -eu

PLUGIN_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TARGET_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

mkdir -p "$TARGET_DIR"
for skill_dir in "$PLUGIN_DIR"/skills/*; do
  [ -d "$skill_dir" ] || continue
  skill_name=$(basename "$skill_dir")
  mkdir -p "$TARGET_DIR/$skill_name"
  cp "$skill_dir"/SKILL.md "$TARGET_DIR/$skill_name"/SKILL.md
done

printf 'Installed Agent Workflow Claude skills to %s\n' "$TARGET_DIR"
