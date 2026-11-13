#!/bin/bash
# Wait for every check on a pull request to resolve, then report them.
# Usage: ./wait-for-pr-checks.sh REPO PR_NUMBER [timeout-seconds]
# Example: ./wait-for-pr-checks.sh trade-imports-ins-frontend 42 2400
#
# Prints one line per check as "<bucket> <name> <link>", then a summary line.
# A failing check that predates the PR's head commit gets a trailing
# "(stale: started <time>, head committed <time>)" on its line.
# Exit codes:
#   0  every check passed (skipped checks count as passed)
#   1  at least one check failed or was cancelled on the current head
#   2  timed out with checks still pending — NOT green, treat as unresolved
#   4  the PR has no checks at all — absence of evidence, not a pass
#   5  every failing check started before the head commit — a stale rollup,
#      not a failure. Re-run the failing jobs; do not fix code for it.
#
# Why exit 5 exists: GitHub does not re-run a pull request's checks when its
# base branch moves, so a PR keeps showing a failure from before its last
# merge. On EUDPA-693 inc-024 that cost five fix attempts across two runs on
# code that was never wrong, and the row landed in 12 minutes once the job was
# re-run. A check that started before the commit under test cannot be evidence
# about that commit, so the only honest reading is "unknown", never "red".
#
# Mixed case is red, not stale: if any failing check did start after the head
# commit, exit 1, because something about the current head really is failing.
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

# When the PR's head commit was committed, as an ISO-8601 Z string. Empty when
# either call fails, which makes every failing check read as current.
head_committed_at() {
    local sha
    sha=$(gh pr view "$PR" --repo "$REPO" --json headRefOid --jq '.headRefOid' 2>/dev/null) || return 0
    [[ -n "$sha" ]] || return 0
    gh api "repos/${REPO}/commits/${sha}" --jq '.commit.committer.date' 2>/dev/null || return 0
}

ELAPSED=0
CONSECUTIVE_FAILURES=0
CHECKS="[]"

while true; do
    if CHECKS=$(gh pr checks "$PR" --repo "$REPO" --json name,bucket,state,link,startedAt 2>/dev/null); then
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

total=$(echo "$CHECKS" | jq 'length')
failed=$(echo "$CHECKS" | jq '[.[] | select(.bucket == "fail" or .bucket == "cancel")] | length')
passed=$(echo "$CHECKS" | jq '[.[] | select(.bucket == "pass" or .bucket == "skipping")] | length')

if [[ "$total" -eq 0 ]]; then
    echo "$CHECKS" | jq -r '.[] | "\(.bucket) \(.name) \(.link)"'
    echo "SUMMARY: no checks on PR #$PR"
    exit 4
fi

if [[ "$failed" -eq 0 ]]; then
    echo "$CHECKS" | jq -r '.[] | "\(.bucket) \(.name) \(.link)"'
    echo "SUMMARY: green — ${passed} of ${total} checks passed"
    exit 0
fi

HEAD_AT=$(head_committed_at)

# A failing check is stale when it started before the head commit. An absent or
# zero-value startedAt says nothing about when it ran, so it counts as current:
# this test only ever downgrades a red it can prove is out of date. An empty
# $head means the lookup failed, and then nothing is stale, for the same reason.
FILTERS='
  def startedBefore($head):
    (.startedAt // "") as $at
    | $head != "" and $at != "" and ($at | startswith("0001")) == false and $at < $head;
  def failing: .bucket == "fail" or .bucket == "cancel";
'

echo "$CHECKS" | jq -r --arg head "$HEAD_AT" "$FILTERS"'
  .[]
  | if (failing and startedBefore($head))
    then "\(.bucket) \(.name) \(.link) (stale: started \(.startedAt), head committed \($head))"
    else "\(.bucket) \(.name) \(.link)"
    end'

current=$(echo "$CHECKS" | jq --arg head "$HEAD_AT" "$FILTERS"'
  [.[] | select(failing) | select(startedBefore($head) | not)] | length')

if [[ "$current" -eq 0 ]]; then
    echo "SUMMARY: stale — all ${failed} failing checks started before the head commit (${HEAD_AT}). Re-run them; this is not a code failure"
    exit 5
fi

echo "SUMMARY: red — ${current} of ${total} checks failed on the current head ($((failed - current)) stale)"
exit 1
