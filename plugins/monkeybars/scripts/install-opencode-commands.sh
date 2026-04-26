#!/usr/bin/env sh
set -eu

PLUGIN_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TARGET_DIR="${OPENCODE_COMMANDS_DIR:-$HOME/.config/opencode/commands}"

mkdir -p "$TARGET_DIR"
cp "$PLUGIN_DIR"/commands/*.md "$TARGET_DIR"/

printf 'Installed MonkeyBars OpenCode commands to %s\n' "$TARGET_DIR"
