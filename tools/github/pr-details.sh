#!/bin/bash
# Get detailed PR information from GitHub
# Usage: ./pr-details.sh REPO PR_NUMBER [format]
# Formats: full (default), files, json

set -e

REPO="${1:-}"
PR_NUMBER="${2:-}"
FORMAT="${3:-full}"

if [[ -z "$REPO" ]] || [[ -z "$PR_NUMBER" ]]; then
    echo "Usage: ./pr-details.sh REPO PR_NUMBER [format]"
    echo "Formats: full (default), files, json"
    exit 1
fi

response=$(gh pr view "$PR_NUMBER" --repo "DEFRA/$REPO" \
    --json title,headRefName,body,state,mergedAt,commits,files,additions,deletions,author,url)

# Every path the PR touches, including the pre-image path of a rename.
# `gh pr view --json files` reports only the post-image, so the deleted
# half of a rename is invisible to callers that seed or verify per-file
# coverage from this list. The REST endpoint carries previous_filename;
# --paginate also lifts the page cap the GraphQL field imposes.
list_files() {
    gh api "repos/DEFRA/$REPO/pulls/$PR_NUMBER/files" --paginate \
        --jq '.[] | .filename, (.previous_filename // empty)'
}

case "$FORMAT" in
    json)
        echo "$response"
        ;;
    files)
        list_files
        ;;
    full|*)
        echo "=== PR #$PR_NUMBER in $REPO ==="
        echo "$response" | jq -r '"Title: \(.title)"'
        echo "$response" | jq -r '"State: \(.state)"'
        echo "$response" | jq -r '"Author: \(.author.login)"'
        echo "$response" | jq -r '"Merged: \(.mergedAt // "Not merged")"'
        echo "$response" | jq -r '"Changes: +\(.additions) -\(.deletions)"'
        echo ""
        echo "=== Files Changed ==="
        list_files
        echo ""
        echo "=== Description ==="
        echo "$response" | jq -r '.body // "No description"'
        ;;
esac
