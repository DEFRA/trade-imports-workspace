#!/usr/bin/env bash
# WP-K — repoint every sub-repo's CI at the new workspace repo.
#
# NOT run as part of the genericisation PR. It edits 25 files across 10
# separate GitHub repos, so it needs to land as 10 coordinated PRs timed with
# the moment DEFRA/trade-imports-workspace becomes authoritative.
#
# Nothing is broken until then: DEFRA/trade-imports-animals-workspace still
# exists and still serves these reusable workflows, so sub-repo CI keeps
# working exactly as it does today.
#
#   Dry run (default):  bash apply-subrepo-callers.sh
#   Apply:              bash apply-subrepo-callers.sh --apply
#
# The substitution is anchored on the unique `-workspace` suffix, so it cannot
# touch the sub-repo slugs trade-imports-animals-{frontend,backend,tests,admin}.
set -euo pipefail

ROOT="$HOME/git/defra/trade-imports-workspace/repos"
OLD='DEFRA/trade-imports-animals-workspace'
NEW='DEFRA/trade-imports-workspace'
BRANCH='chore/repoint-workspace-ci'

APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true

for repo in "$ROOT"/*/; do
  name=$(basename "$repo")
  [ -d "$repo/.github" ] || continue

  files=()
  while IFS= read -r f; do files+=("$f"); done < <(grep -rl "$OLD" "$repo.github" 2>/dev/null || true)
  [ ${#files[@]} -eq 0 ] && continue

  hits=$(grep -rc "$OLD" "${files[@]}" | awk -F: '{s+=$2} END {print s}')
  printf '%-36s %2d files, %2d refs\n' "$name" "${#files[@]}" "$hits"

  if [ "$APPLY" = true ]; then
    git -C "$repo" checkout -b "$BRANCH"
    for f in "${files[@]}"; do
      LC_ALL=C sed -i '' "s|${OLD}|${NEW}|g" "$f"
    done
    git -C "$repo" add .github
    git -C "$repo" commit -m "chore: point CI at DEFRA/trade-imports-workspace

The shared workspace repo moved from trade-imports-animals-workspace to the
generic trade-imports-workspace. This repoints the reusable workflow and
composite action references. No behaviour change.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
  fi
done

if [ "$APPLY" = false ]; then
  echo
  echo "Dry run. Re-run with --apply to branch, edit and commit in each repo."
  echo "Push and raise the PRs by hand — check each repo is not mid-spike first."
fi
