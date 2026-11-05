#!/bin/bash
# Find GitHub PRs for a JIRA ticket
# Usage: ./prs.sh EUDPA-XXXXX [format] [--own]
# Formats: list (default), json, urls
#
# The search is GitHub full-text, so it also finds PRs for other tickets
# that only mention this one in a description or comment.
#
# --own  keep only the ticket's own PRs: those whose title or head branch
#        carries the ticket key. Each PR left out is named on stderr.

set -e

TICKET=""
FORMAT="list"
OWN="false"

for arg in "$@"; do
    case "$arg" in
        --own) OWN="true" ;;
        -h|--help) TICKET="" ; break ;;
        *)
            if [[ -z "$TICKET" ]]; then
                TICKET="$arg"
            else
                FORMAT="$arg"
            fi
            ;;
    esac
done

if [[ -z "$TICKET" ]]; then
    echo "Usage: ./prs.sh EUDPA-XXXXX [format] [--own]"
    echo "Formats: list (default), json, urls"
    echo "  --own  keep only PRs whose title or head branch carries the ticket key"
    exit 1
fi

response=$(gh search prs "$TICKET" --owner DEFRA --json number,title,repository,url,state,createdAt 2>/dev/null)

if [[ "$OWN" == "true" ]] && [[ -n "$response" ]] && [[ "$response" != "[]" ]]; then
    # The key as a whole token: EUDPA-674 matches feat/EUDPA-674-x but not EUDPA-6740.
    key_pattern="(^|[^A-Za-z0-9])${TICKET}([^0-9]|$)"
    kept="[]"
    while IFS= read -r pr; do
        repo=$(jq -r '.repository.nameWithOwner // ("DEFRA/" + .repository.name)' <<< "$pr")
        number=$(jq -r '.number' <<< "$pr")
        title=$(jq -r '.title' <<< "$pr")
        branch=$(gh pr view "$number" --repo "$repo" --json headRefName --jq .headRefName 2>/dev/null) || branch=""
        if jq -en --arg s "$title" --arg p "$key_pattern" '$s | test($p; "i")' > /dev/null \
            || jq -en --arg s "$branch" --arg p "$key_pattern" '$s | test($p; "i")' > /dev/null; then
            kept=$(jq -c --argjson pr "$pr" '. + [$pr]' <<< "$kept")
        else
            echo "Left out ${repo#DEFRA/}#$number: not $TICKET's own PR (branch '$branch', title '$title')" >&2
        fi
    done < <(jq -c '.[]' <<< "$response")
    response="$kept"
fi

if [[ -z "$response" ]] || [[ "$response" == "[]" ]]; then
    case "$FORMAT" in
        json)
            echo "[]"
            ;;
        urls)
            ;;
        list|*)
            echo "No PRs found for $TICKET"
            ;;
    esac
    exit 0
fi

case "$FORMAT" in
    json)
        echo "$response"
        ;;
    urls)
        echo "$response" | jq -r '.[].url'
        ;;
    list|*)
        echo "=== PRs for $TICKET ==="
        echo "$response" | jq -r '.[] | "[\(.state)] \(.repository.name)#\(.number): \(.title)\n  \(.url)\n"'
        ;;
esac
