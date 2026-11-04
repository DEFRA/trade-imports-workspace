#!/usr/bin/env bash
# Install or repair the workspace → personal Cursor skills link.
#
# Default store: ~/.cursor/skills/trade-imports-workspace (local git recommended).
# Override: TRADE_IMPORTS_CURSOR_SKILLS=/path/to/store
#
# Usage:
#   install-cursor-skills.sh [--sync]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=cursor-skills-paths.sh
source "$SCRIPT_DIR/cursor-skills-paths.sh"

RUN_SYNC=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --sync) RUN_SYNC=true; shift ;;
    -h | --help)
      sed -n '2,12p' "$0" >&2
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$WS/.cursor"
mkdir -p "$CURSOR"

if [[ -d "$WORKSPACE_CURSOR_LINK" && ! -L "$WORKSPACE_CURSOR_LINK" ]]; then
  echo "Migrating existing $WORKSPACE_CURSOR_LINK → $CURSOR"
  rsync -a --delete "$WORKSPACE_CURSOR_LINK/" "$CURSOR/"
  rm -rf "$WORKSPACE_CURSOR_LINK"
fi

if [[ -e "$WORKSPACE_CURSOR_LINK" && ! -L "$WORKSPACE_CURSOR_LINK" ]]; then
  echo "ERROR: $WORKSPACE_CURSOR_LINK exists and is not a directory or symlink" >&2
  exit 1
fi

if [[ -L "$WORKSPACE_CURSOR_LINK" ]]; then
  current="$(readlink "$WORKSPACE_CURSOR_LINK")"
  if [[ "$current" != "$CURSOR" ]]; then
    echo "Replacing symlink $WORKSPACE_CURSOR_LINK (was $current)"
    rm "$WORKSPACE_CURSOR_LINK"
    ln -s "$CURSOR" "$WORKSPACE_CURSOR_LINK"
  else
    echo "OK: $WORKSPACE_CURSOR_LINK → $CURSOR"
  fi
elif [[ ! -e "$WORKSPACE_CURSOR_LINK" ]]; then
  echo "Linking $WORKSPACE_CURSOR_LINK → $CURSOR"
  ln -s "$CURSOR" "$WORKSPACE_CURSOR_LINK"
fi

if [[ "$RUN_SYNC" == true ]]; then
  bash "$WS/tools/skill-creator/sync-cursor-skills.sh"
fi

echo ""
echo "Cursor adapters: $CURSOR"
echo "Workspace link:  $WORKSPACE_CURSOR_LINK"
echo "After editing Claude references/, run:"
echo "  bash $WS/tools/skill-creator/sync-cursor-skills.sh"
