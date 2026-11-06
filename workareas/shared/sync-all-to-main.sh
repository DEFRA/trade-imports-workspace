#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
failed=0

sync_repo() {
  local dir="$1"
  local name="$2"
  echo "=== $name ==="
  if ! git -C "$dir" fetch origin; then
    echo "FAIL: fetch"
    return 1
  fi
  if ! git -C "$dir" checkout main; then
    echo "FAIL: checkout main"
    return 1
  fi
  if ! git -C "$dir" pull --rebase origin main; then
    echo "FAIL: pull --rebase"
    return 1
  fi
  git -C "$dir" status --short --branch | head -1
  echo "OK"
}

for dir in "$WORKSPACE" "$WORKSPACE"/repos/*/; do
  [ -d "$dir/.git" ] || continue
  name=$(basename "$dir")
  [ "$name" = "trade-imports-workspace" ] && name="workspace"
  if ! sync_repo "$dir" "$name"; then
    failed=1
  fi
done

exit "$failed"
