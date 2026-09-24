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

UPSTREAM_FETCH_REFSPEC='+refs/heads/main:refs/remotes/upstream/main'

# Idempotent: reads the current config first and only writes what's
# wrong, so a repo whose upstream remote is already correct is left
# untouched. A repo without an "upstream" manifest field is a no-op.
ensure_upstream_remote() {
  local name=$1
  local dir=$2
  local upstream_name
  upstream_name="$(jq -r --arg name "$name" '.repos[] | select(.name == $name) | .upstream // empty' "$MANIFEST")"
  [ -z "$upstream_name" ] && return

  local url="https://github.com/${GITHUB_ORG}/${upstream_name}.git"
  local current_url current_fetch current_tagopt current_pushurl
  current_url="$(git -C "$dir" config --get remote.upstream.url 2>/dev/null || true)"
  current_fetch="$(git -C "$dir" config --get-all remote.upstream.fetch 2>/dev/null || true)"
  current_tagopt="$(git -C "$dir" config --get remote.upstream.tagOpt 2>/dev/null || true)"
  current_pushurl="$(git -C "$dir" config --get remote.upstream.pushurl 2>/dev/null || true)"

  if [ "$current_url" = "$url" ] && [ "$current_fetch" = "$UPSTREAM_FETCH_REFSPEC" ] \
    && [ "$current_tagopt" = "--no-tags" ] && [ "$current_pushurl" = "DISABLED" ]; then
    return
  fi

  if [ -z "$current_url" ]; then
    git -C "$dir" remote add upstream "$url"
    echo "  $name — upstream remote added"
  elif [ "$current_url" != "$url" ]; then
    git -C "$dir" remote set-url upstream "$url"
    echo "  $name — upstream remote url corrected"
  fi
  git -C "$dir" config --replace-all remote.upstream.fetch "$UPSTREAM_FETCH_REFSPEC"
  git -C "$dir" config --replace-all remote.upstream.tagOpt -- "--no-tags"
  git -C "$dir" config --replace-all remote.upstream.pushurl -- "DISABLED"
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
  ensure_upstream_remote "$name" "$REPOS_DIR/$name"
}

echo "Setting up trade-imports workspace..."
while IFS= read -r repo; do
  clone_if_missing "$repo"
done < <(jq -r '.repos[].name' "$MANIFEST")
echo "Done."
