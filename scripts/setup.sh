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
GITHUB_ORG="$(jq -r '.githubOrg' "$MANIFEST")"

mkdir -p "$REPOS_DIR"

# gh-pages holds multi-GB published artifacts; git has no "all branches
# except X" clone flag, so bootstrap is clone-narrow then widen behind
# the exclusion refspec.
clone_light() {
  local url=$1
  local dir=$2
  git clone --single-branch "$url" "$dir"
  "$LIGHT_REMOTE" --exclude-gh-pages "$dir"
  git -C "$dir" fetch --quiet origin
}

# One-off migration for clones born before the exclusion refspec: pin
# the config, then gc to drop the already-fetched gh-pages packs.
heal_if_unpinned() {
  local name=$1
  local dir=$2
  if git -C "$dir" config --get-all remote.origin.fetch | grep -qxF '^refs/heads/gh-pages'; then
    echo "  $name — already exists, skipping"
    return
  fi
  echo "  $name — excluding gh-pages from fetches (one-off; gc of a large clone can take minutes)"
  "$LIGHT_REMOTE" --exclude-gh-pages "$dir"
  git -C "$dir" fetch --quiet origin
  git -C "$dir" gc --prune=now --quiet
}

clone_if_missing() {
  local name=$1
  local url="https://github.com/${GITHUB_ORG}/${name}.git"
  if [ -d "$REPOS_DIR/$name" ]; then
    heal_if_unpinned "$name" "$REPOS_DIR/$name"
  else
    echo "  $name — cloning..."
    clone_light "$url" "$REPOS_DIR/$name"
  fi
}

echo "Setting up trade-imports workspace..."
while IFS= read -r repo; do
  clone_if_missing "$repo"
done < <(jq -r '.repos[].name' "$MANIFEST")
echo "Done."
