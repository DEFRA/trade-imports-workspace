#!/usr/bin/env bash
#
# Writes prs.json: every Design Release 2.1 pull request in the repos the
# programme touches, keyed by the branch it was raised from.
#
# make-data.mjs reads it to say, per theme, which pull requests exist and
# whether they merged. It is fetched rather than derived because a backlog row
# records the pull request it was built in but not what later became of it: the
# address book's first draft pull requests were closed and the work re-raised
# per ticket, and five theme branches carry pull requests nobody will merge.
#
# Run it before `npm run build` whenever the pull requests may have moved.
#
# Usage: bash fetch-prs.sh

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$here/prs.json"

repos=(
  trade-imports-animals-frontend
  trade-imports-animals-backend
  trade-imports-ins-frontend
  trade-imports-plants-frontend
  trade-imports-plants-backend
  trade-imports-ins-backend
  trade-imports-ins-tests
  trade-imports-stub
  trade-imports-reference-data
  trade-imports-performance-tests
  trade-imports-address-book
  trade-imports-defra-id-stub
)

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

for repo in "${repos[@]}"; do
  gh pr list --repo "DEFRA/$repo" --state all --limit 800 \
    --json number,title,state,headRefName,mergedAt,url \
    | jq --arg repo "$repo" '
        [ .[]
          | select(.headRefName | test("design-release-2-1"))
          | { branch: .headRefName, repo: $repo, number, state, url, mergedAt, title }
        ]' > "$tmp/$repo.json"
done

jq -s --arg fetchedAt "$(date -u +%Y-%m-%d)" '
  {
    comment: "Design Release 2.1 pull requests, keyed by the branch they were raised from. Written by fetch-prs.sh; read by make-data.mjs. Do not edit by hand.",
    fetchedAt: $fetchedAt,
    branches: (add | group_by(.branch) | map({ key: .[0].branch, value: (. | sort_by(.repo)) }) | from_entries)
  }' "$tmp"/*.json > "$out"

echo "prs.json written: $(jq '.branches | length' "$out") branches, $(jq '[.branches[] | length] | add' "$out") pull requests"
