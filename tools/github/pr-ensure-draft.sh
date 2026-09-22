#!/bin/bash
# Make sure a DRAFT pull request exists for a branch, reusing an open one.
# Usage: ./pr-ensure-draft.sh REPO BRANCH TITLE BODY_FILE [BASE]
# Prints one JSON object: {number, url, state, isDraft, created}
#
# Exit codes:
#   0  an open PR exists (reused or just created)
#   3  the branch only has MERGED or CLOSED PRs — the lifecycle is out of step,
#      and a fresh PR would hide that; a human decides
#   1  usage or gh failure

set -e

REPO="${1:-}"
BRANCH="${2:-}"
TITLE="${3:-}"
BODY_FILE="${4:-}"
BASE="${5:-main}"

if [[ -z "$REPO" ]] || [[ -z "$BRANCH" ]] || [[ -z "$TITLE" ]] || [[ -z "$BODY_FILE" ]]; then
    echo "Usage: ./pr-ensure-draft.sh REPO BRANCH TITLE BODY_FILE [BASE]" >&2
    exit 1
fi

if [[ "$REPO" != */* ]]; then
    REPO="DEFRA/${REPO}"
fi

if [[ ! -f "$BODY_FILE" ]]; then
    echo "Body file not found: $BODY_FILE" >&2
    exit 1
fi

existing=$(gh pr list --repo "$REPO" --head "$BRANCH" --state all \
    --json number,url,state,isDraft --limit 20)

open_pr=$(echo "$existing" | jq -c '[.[] | select(.state == "OPEN")] | first // empty')

if [[ -n "$open_pr" ]]; then
    echo "$open_pr" | jq -c '. + {created: false}'
    exit 0
fi

if [[ "$existing" != "[]" ]]; then
    echo "Branch $BRANCH in $REPO only has merged or closed PRs:" >&2
    echo "$existing" | jq -r '.[] | "  #\(.number) \(.state) \(.url)"' >&2
    exit 3
fi

gh pr create --repo "$REPO" --base "$BASE" --head "$BRANCH" --draft \
    --title "$TITLE" --body-file "$BODY_FILE" >/dev/null

created=$(gh pr list --repo "$REPO" --head "$BRANCH" --state open \
    --json number,url,state,isDraft --limit 1 | jq -c 'first')

echo "$created" | jq -c '. + {created: true}'
