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
# A branch counts when its name says design-release-2-1, or when themes.json or
# delivery.meta.json names it. The second half matters: a theme branch need not
# carry the programme in its name — feat/EUDPA-693-commodities-and-reason and
# feat/EUDPA-690-type-question do not — and a name test on its own silently
# leaves those themes with no pull requests on the page.
#
# Usage: npm run prs (from this directory). The Bash deny list blocks a bare
#        `bash fetch-prs.sh`, so the npm script is the route an agent can take —
#        the same one `npm run build` and `npm run check` already use.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$here/prs.json"
workarea="$(cd "$here/../../.." && pwd)"

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
mkdir "$tmp/prs"

# Every branch a theme is delivered on, whichever file names it.
jq -s '[ (.[0].themes[].branch), (.[1].themes[].branches[]) ] | map(select(. != null)) | unique' \
  "$workarea/themes/themes.json" "$here/delivery.meta.json" > "$tmp/branches.json"

for repo in "${repos[@]}"; do
  gh pr list --repo "DEFRA/$repo" --state all --limit 800 \
    --json number,title,state,headRefName,mergedAt,url \
    | jq --arg repo "$repo" --slurpfile named "$tmp/branches.json" '
        [ .[]
          | select((.headRefName | test("design-release-2-1")) or (.headRefName | IN($named[0][])))
          | { branch: .headRefName, repo: $repo, number, state, url, mergedAt, title }
        ]' > "$tmp/prs/$repo.json"
done

jq -s --arg fetchedAt "$(date -u +%Y-%m-%d)" '
  {
    comment: "Design Release 2.1 pull requests, keyed by the branch they were raised from. Written by fetch-prs.sh; read by make-data.mjs. Do not edit by hand.",
    fetchedAt: $fetchedAt,
    branches: (add | group_by(.branch) | map({ key: .[0].branch, value: (. | sort_by(.repo)) }) | from_entries)
  }' "$tmp"/prs/*.json > "$out"

echo "prs.json written: $(jq '.branches | length' "$out") branches, $(jq '[.branches[] | length] | add' "$out") pull requests"
