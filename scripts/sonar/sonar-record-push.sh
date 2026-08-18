#!/bin/bash
#
# sonar-record-push.sh — PostToolUse(git push) hook.
#
# Records a "pending SonarCloud check" for each sonar repo at its just-pushed HEAD,
# then exits immediately. It does NOT wait for CI — long-lived async hooks get
# reaped when the session goes idle, so the findings are surfaced later by
# sonar-check-pending.sh on UserPromptSubmit / SessionStart (a fast, non-blocking
# query that runs whenever you next interact).
#
# Fast + fail-open: never blocks the push, never errors out of the way.
# Targets bash 3.2 (macOS stock): no associative arrays, no `set -u`.

ROOT="${CLAUDE_PROJECT_DIR:-$HOME/git/defra/trade-imports-workspace}"
# Deterministic, gitignored workspace-local state so the record hook and the
# check hook always agree (a per-session $TMPDIR can differ between launch
# contexts). Survives reboots.
STATE_DIR="$ROOT/.sonar-checks"

# repo dir (under $ROOT/repos) -> SonarCloud project key. The gateway key has no
# "animals" segment.
SONAR_REPOS="trade-imports-animals-frontend:DEFRA_trade-imports-animals-frontend
trade-imports-animals-admin:DEFRA_trade-imports-animals-admin
trade-imports-animals-backend:DEFRA_trade-imports-animals-backend
trade-imports-dynamics-gateway:DEFRA_trade-imports-dynamics-gateway"

command -v git >/dev/null 2>&1 || exit 0
mkdir -p "$STATE_DIR" 2>/dev/null || exit 0

now=$(date +%s 2>/dev/null || echo 0)

printf '%s\n' "$SONAR_REPOS" | while IFS=: read -r repo_name project; do
  [ -n "$repo_name" ] || continue
  repo_dir="$ROOT/repos/$repo_name"
  [ -e "$repo_dir/.git" ] || continue

  branch=$(git -C "$repo_dir" symbolic-ref --short -q HEAD 2>/dev/null) || continue
  [ -n "$branch" ] || continue
  case "$branch" in main | master) continue ;; esac

  head_sha=$(git -C "$repo_dir" rev-parse HEAD 2>/dev/null) || continue
  upstream_sha=$(git -C "$repo_dir" rev-parse '@{upstream}' 2>/dev/null) || continue
  # Only repos whose HEAD is actually pushed — otherwise nothing for Sonar to scan.
  [ "$head_sha" = "$upstream_sha" ] || continue

  # Skip if this exact commit has already been surfaced once.
  [ -f "$STATE_DIR/seen__${project}__${head_sha}" ] && continue

  # branch on line 1, pushed-at epoch on line 2.
  printf '%s\n%s\n' "$branch" "$now" >"$STATE_DIR/pending__${project}__${head_sha}" 2>/dev/null
done

exit 0
