#!/usr/bin/env bash
# Ensure Cursor skill adapters mirror .claude/skills/<name>/ layout:
#   references/ and assets/ → absolute symlinks into Claude (never duplicate worker prose)
#   other root files (e.g. decisions.md) → symlink when Claude has a regular file
#
# Cursor adapters default to ~/.cursor/skills/trade-imports-workspace (see
# tools/cursor/install-cursor-skills.sh). Workspace .cursor/skills should symlink there.
#
# Usage:
#   sync-cursor-skills.sh [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../cursor/cursor-skills-paths.sh
source "$SCRIPT_DIR/../cursor/cursor-skills-paths.sh"

DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    -h | --help)
      sed -n '2,14p' "$0" >&2
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

resolve_cursor_skills_root

if [[ ! -d "$CLAUDE" ]]; then
  echo "ERROR: Claude skills not found at $CLAUDE" >&2
  exit 1
fi

if [[ ! -d "$CURSOR" ]]; then
  echo "ERROR: Cursor skills store not found at $CURSOR" >&2
  echo "Run: bash $WS/tools/cursor/install-cursor-skills.sh" >&2
  exit 1
fi

link_path() {
  local target="$1"
  local link="$2"
  if [[ -L "$link" ]]; then
    local current
    current="$(readlink "$link")"
    if [[ "$current" == "$target" ]]; then
      return 0
    fi
    echo "  replace symlink $link (was $current)"
    [[ "$DRY_RUN" == true ]] || rm "$link"
  elif [[ -d "$link" ]]; then
    echo "  replace directory $link with symlink"
    [[ "$DRY_RUN" == true ]] || rm -rf "$link"
  elif [[ -f "$link" ]]; then
    echo "  replace file $link with symlink"
    [[ "$DRY_RUN" == true ]] || rm "$link"
  elif [[ -e "$link" ]]; then
    echo "  ERROR: $link exists and is not a symlink — remove or merge manually" >&2
    return 1
  fi
  echo "  ln -s $target $link"
  [[ "$DRY_RUN" == true ]] || ln -s "$target" "$link"
}

missing_adapters=()
linked=0

echo "Workspace:  $WS"
echo "Claude:     $CLAUDE"
echo "Cursor:     $CURSOR"
echo ""

for skill_dir in "$CLAUDE"/*/; do
  [[ -d "$skill_dir" ]] || continue
  name="$(basename "$skill_dir")"
  [[ -f "$skill_dir/SKILL.md" ]] || continue

  cursor_skill="$CURSOR/$name"
  cursor_skill_md="$cursor_skill/SKILL.md"

  echo "=== $name ==="

  if [[ ! -f "$cursor_skill_md" ]]; then
    missing_adapters+=("$name")
    echo "  no Cursor adapter — skip (Claude-only)"
    continue
  fi

  [[ -d "$cursor_skill" ]] || {
    echo "  mkdir $cursor_skill"
    [[ "$DRY_RUN" == true ]] || mkdir -p "$cursor_skill"
  }

  if [[ -d "$skill_dir/references" ]]; then
    link_path "$CLAUDE/$name/references" "$cursor_skill/references"
    linked=$((linked + 1))
  fi

  if [[ -d "$skill_dir/assets" ]]; then
    link_path "$CLAUDE/$name/assets" "$cursor_skill/assets"
    linked=$((linked + 1))
  fi

  for claude_file in "$skill_dir"/*; do
    [[ -f "$claude_file" ]] || continue
    base="$(basename "$claude_file")"
    [[ "$base" == "SKILL.md" ]] && continue
    link_path "$CLAUDE/$name/$base" "$cursor_skill/$base"
    linked=$((linked + 1))
  done
done

echo ""
echo "Symlink pairs checked/updated: $linked skill-side paths"
if ((${#missing_adapters[@]} > 0)); then
  echo "Claude-only (no Cursor SKILL.md): ${missing_adapters[*]}"
  echo "See $CURSOR/HOST.md § Skill fidelity."
fi
