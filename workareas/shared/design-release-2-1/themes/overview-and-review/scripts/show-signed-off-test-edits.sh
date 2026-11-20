#!/usr/bin/env bash
# Show every test this theme changed that proves a signed-off scenario,
# as a diff against main, so you can judge whether the agreed behaviour still holds.
#
#   bash ~/git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/themes/overview-and-review/scripts/show-signed-off-test-edits.sh | less -R
#
# Approve: run merge-theme.sh, which takes the pull requests out of draft.
# Refuse: tell Claude which test edits to undo.
set -euo pipefail

WS=~/git/defra/trade-imports-workspace
CHECK="$WS/workareas/shared/design-release-2-1/themes/overview-and-review/logs/theme-overview-and-review-signed-off.json"

jq -r '.. | objects | select(has("kind") or has("change")) | (.test // empty) | "\(.repo) \(.file)"' "$CHECK" | sort -u |
while read -r repo file; do
  echo
  echo "################ $repo  $file"
  git -C "$WS/repos/$repo" fetch -q origin main
  git -C "$WS/repos/$repo" diff --color=always origin/main...feat/EUDPA-696-overview-and-review -- "$file"
done
