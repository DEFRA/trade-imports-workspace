#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/../repos.json"
LIGHT_REMOTE="$SCRIPT_DIR/../tools/git/light-remote.sh"

if ! command -v jq >/dev/null 2>&1; then
  echo "This script needs jq to read the repo roster ($MANIFEST). Install jq and run it again." >&2
  exit 1
fi

REPOS_DIR="$SCRIPT_DIR/../$(jq -r '.reposDir' "$MANIFEST")"

# Accepts repo names as arguments, falls back to the whole roster
if [ $# -gt 0 ]; then
  REPOS=("$@")
else
  REPOS=()
  while IFS= read -r repo; do
    REPOS+=("$repo")
  done < <(jq -r '.repos[].name' "$MANIFEST")
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
