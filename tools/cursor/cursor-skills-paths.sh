#!/usr/bin/env bash
# Shared paths for trade-imports Cursor skill adapters (sourced, not executed).
#
# Cursor host SKILL.md files live outside the workspace by default so a
# `git checkout main` in the workspace does not delete them. The workspace
# links `.cursor/skills` → that store; sync keeps symlinks into `.claude/skills/`.

: "${TRADE_IMPORTS_WORKSPACE:=$HOME/git/defra/trade-imports-workspace}"
: "${TRADE_IMPORTS_CURSOR_SKILLS:=$HOME/.cursor/skills/trade-imports-workspace}"

WS="$TRADE_IMPORTS_WORKSPACE"
CLAUDE="$WS/.claude/skills"
CURSOR="$TRADE_IMPORTS_CURSOR_SKILLS"
WORKSPACE_CURSOR_LINK="$WS/.cursor/skills"

resolve_cursor_skills_root() {
  if [[ -L "$WORKSPACE_CURSOR_LINK" ]]; then
    local resolved
    resolved="$(readlink -f "$WORKSPACE_CURSOR_LINK" 2>/dev/null || true)"
    if [[ -n "$resolved" && -d "$resolved" ]]; then
      CURSOR="$resolved"
    fi
  elif [[ -d "$WORKSPACE_CURSOR_LINK" && ! -L "$WORKSPACE_CURSOR_LINK" ]]; then
    CURSOR="$WORKSPACE_CURSOR_LINK"
  fi
}
