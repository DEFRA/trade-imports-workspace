#!/bin/bash
# Wait for every check on a pull request to resolve, then report them.
# Usage: ./wait-for-pr-checks.sh REPO PR_NUMBER [timeout-seconds]
# Example: ./wait-for-pr-checks.sh trade-imports-ins-frontend 42 2400
#
# Prints one line per check as "<bucket> <name> <link>", then a summary line.
# Exit codes:
#   0  every check passed (skipped checks count as passed)
#   1  at least one check failed or was cancelled
#   2  timed out with checks still pending — NOT green, treat as unresolved
#   4  the PR has no checks at all — absence of evidence, not a pass
#
# Polls `gh pr checks --json` rather than `--watch`: watch has no timeout and
# dies on a transient API error; polling tolerates both.

set -e

REPO="${1:-}"
PR="${2:-}"
TIMEOUT="${3:-2400}"
INTERVAL=30

if [[ -z "$REPO" ]] || [[ -z "$PR" ]]; then
    echo "Usage: ./wait-for-pr-checks.sh REPO PR_NUMBER [timeout-seconds]" >&2
    exit 1
fi

if [[ "$REPO" != */* ]]; then
    REPO="DEFRA/${REPO}"
fi

ELAPSED=0
CONSECUTIVE_FAILURES=0
CHECKS="[]"

while true; do
    if CHECKS=$(gh pr checks "$PR" --repo "$REPO" --json name,bucket,state,link 2>/dev/null); then
        CONSECUTIVE_FAILURES=0
        total=$(echo "$CHECKS" | jq 'length')
        pending=$(echo "$CHECKS" | jq '[.[] | select(.bucket == "pending")] | length')
        if [[ "$total" -gt 0 ]] && [[ "$pending" -eq 0 ]]; then
            break
        fi
    else
        CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
        if [[ "$CONSECUTIVE_FAILURES" -ge 5 ]]; then
            echo "Cannot read checks for PR #$PR in $REPO (5 consecutive failures)." >&2
            exit 1
        fi
    fi

    if [[ "$ELAPSED" -ge "$TIMEOUT" ]]; then
        echo "$CHECKS" | jq -r '.[] | "\(.bucket) \(.name) \(.link)"'
        echo "SUMMARY: timed out after ${TIMEOUT}s with checks still pending"
        exit 2
    fi
    sleep "$INTERVAL"
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo "$CHECKS" | jq -r '.[] | "\(.bucket) \(.name) \(.link)"'

total=$(echo "$CHECKS" | jq 'length')
failed=$(echo "$CHECKS" | jq '[.[] | select(.bucket == "fail" or .bucket == "cancel")] | length')
passed=$(echo "$CHECKS" | jq '[.[] | select(.bucket == "pass" or .bucket == "skipping")] | length')

if [[ "$total" -eq 0 ]]; then
    echo "SUMMARY: no checks on PR #$PR"
    exit 4
fi

if [[ "$failed" -gt 0 ]]; then
    echo "SUMMARY: red — ${failed} of ${total} checks failed"
    exit 1
fi

echo "SUMMARY: green — ${passed} of ${total} checks passed"
exit 0
