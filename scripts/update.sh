#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOS_DIR="$SCRIPT_DIR/../repos"
LIGHT_REMOTE="$SCRIPT_DIR/../tools/git/light-remote.sh"

# Accepts repo names as arguments, falls back to hardcoded list
if [ $# -gt 0 ]; then
  REPOS=("$@")
else
  REPOS=(
    trade-imports-animals-frontend
    trade-imports-animals-backend
    trade-imports-animals-tests
    trade-imports-animals-admin
    trade-imports-stub
    trade-imports-reference-data
    trade-imports-defra-id-stub
    trade-imports-dynamics-gateway
  )
fi

# One-off migration for clones born before the exclusion refspec: pin
# the config, then gc to drop the already-fetched gh-pages packs.
heal_if_unpinned() {
  local name=$1
  local dir=$2
  if git -C "$dir" config --get-all remote.origin.fetch | grep -qxF '^refs/heads/gh-pages'; then
    return
  fi
  echo "  $name — excluding gh-pages from fetches (one-off; gc of a large clone can take minutes)"
  "$LIGHT_REMOTE" --exclude-gh-pages "$dir"
  git -C "$dir" fetch --quiet origin
  git -C "$dir" gc --prune=now --quiet
}

echo "Updating trade-imports workspace..."
for repo in "${REPOS[@]}"; do
  dir="$REPOS_DIR/$repo"
  if [ -d "$dir/.git" ]; then
    heal_if_unpinned "$repo" "$dir"
    echo "  $repo — pulling..."
    git -C "$dir" pull --rebase
  else
    echo "  $repo — not cloned, skipping (run make setup first)"
  fi
done
echo "Done."
