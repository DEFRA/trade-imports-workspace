#!/bin/bash
# Set implementation_status (and related fields) on one package row in
# packages.{repo}.json. Called by runners / upgrade-one-package.sh.
#
# Usage:
#   packages-set-status.sh --run-id TICKET --repo REPO --package PKG \
#                          --status todo|inprogress|done|failed \
#                          [--failure-reason "..."] \
#                          [--commit-sha SHA]
#
# Side effects:
#   - status=done|failed  → sets completed_at to current UTC ISO-8601
#   - status=done         → expects --commit-sha; populates commit_sha,
#                           clears failure_reason
#   - status=failed       → expects --failure-reason; clears commit_sha
#   - status=todo|inprogress → clears completed_at, commit_sha,
#                              failure_reason

set -e

RUN_ID=""
REPO=""
PACKAGE=""
STATUS=""
FAILURE_REASON=""
SET_FAILURE=0
COMMIT_SHA=""
SET_COMMIT=0

usage() {
    cat <<EOF >&2
Usage: $0 --run-id TICKET --repo REPO --package PKG \\
    --status todo|inprogress|done|failed \\
    [--failure-reason "..."] [--commit-sha SHA]
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --package) PACKAGE="$2"; shift 2 ;;
        --status) STATUS="$2"; shift 2 ;;
        --failure-reason) FAILURE_REASON="$2"; SET_FAILURE=1; shift 2 ;;
        --commit-sha) COMMIT_SHA="$2"; SET_COMMIT=1; shift 2 ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$RUN_ID" ]] && usage
[[ -z "$REPO" ]] && usage
[[ -z "$PACKAGE" ]] && usage
[[ -z "$STATUS" ]] && usage

case "$STATUS" in
    todo|inprogress|done|failed) ;;
    *) echo "Invalid --status: $STATUS" >&2; exit 1 ;;
esac

TARGET="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$RUN_ID/$REPO/packages.${REPO}.json"
[[ -f "$TARGET" ]] || { echo "Packages file not found: $TARGET" >&2; exit 1; }

exists=$(jq --arg p "$PACKAGE" '[.packages[] | select(.package == $p)] | length' "$TARGET")
[[ "$exists" -eq 0 ]] && { echo "Package not found in $TARGET: $PACKAGE" >&2; exit 1; }

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Compute the fields-to-set based on status.
case "$STATUS" in
    todo|inprogress)
        completed='null'
        commit='null'
        failure='null'
        ;;
    done)
        completed=$(jq -nc --arg v "$NOW" '$v')
        commit='null'
        [[ "$SET_COMMIT" == "1" ]] && commit=$(jq -nc --arg v "$COMMIT_SHA" 'if $v == "" then null else $v end')
        failure='null'
        ;;
    failed)
        completed=$(jq -nc --arg v "$NOW" '$v')
        commit='null'
        failure='null'
        [[ "$SET_FAILURE" == "1" ]] && failure=$(jq -nc --arg v "$FAILURE_REASON" 'if $v == "" then null else $v end')
        ;;
esac

jq \
    --arg p "$PACKAGE" \
    --arg status "$STATUS" \
    --argjson completed "$completed" \
    --argjson commit "$commit" \
    --argjson failure "$failure" \
    '.packages |= map(
        if .package == $p then
            .implementation_status = $status
            | .completed_at = $completed
            | .commit_sha = $commit
            | .failure_reason = $failure
        else . end
    )' "$TARGET" > "$TARGET.tmp" && mv "$TARGET.tmp" "$TARGET"

echo "Status $PACKAGE in $REPO: $STATUS"
