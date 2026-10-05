#!/bin/bash
# Run one repo's audit-ci check and report what it found.
#
# Usage:
#   audit-baseline.sh --run-id TICKET --repo REPO [--label LABEL] [--repo-path PATH]
#
# Runs `audit-ci --config audit-ci.jsonc --report-type full
# --output-format json` in the repo (the same audit the repo's
# `security-audit` script and CI run), saves the npm audit report to
#
#   workareas/npm-upgrades/{run-id}/{repo}/audit.{repo}.{label}.json
#
# and prints one JSON summary on stdout (also saved alongside as
# audit.{repo}.{label}.summary.json):
#
#   {
#     "repo", "label", "green",          green = audit-ci passed
#     "failing": [GHSA...],              at the threshold, not allowlisted
#     "allowlisted": [GHSA...],          at the threshold, allowlisted
#     "stale": [GHSA...],                allowlisted, no longer reported
#     "inactive_allowlist": [GHSA...],   entries audit-ci ignores (inactive or expired)
#     "fixable_allowlisted": [{ghsa, package, fixes, fixed_version}],
#     "blocked_allowlisted": [{ghsa, package, fixes, fixed_version}],
#     "failing_fixable": [{ghsa, package, fixes, fixed_version}],
#     "failing_no_fix": [{ghsa, package, title}],
#     "advisories": [{ghsa, package, severity, ranges, title}],
#     "snapshot": "<path>"
#   }
#
# failing_fixable / failing_no_fix split the failing advisories by
# whether a fixed version exists, so a caller can allowlist only the
# ones with no fix (audit-allowlist-add.sh) and take the rest.
#
# fixable_allowlisted: an allowlisted advisory that now has a fixed
# version (a published version newer than the installed one and outside
# every vulnerable range). The entry should go: take the fix instead.
# An entry whose notes say "Fix blocked upstream:" (written by
# audit-allowlist-add.sh --blocked-by) is reported as
# blocked_allowlisted instead, with the fix it is waiting for.
#
# This script does not check the allowlist rules (entry shape, owner,
# expiry within 3 months). Each repo's CI "Check audit allowlist" step
# owns those.
#
# Exit codes:
#   0  green, and no fixable_allowlisted
#   1  red, or an allowlisted advisory now has a fix
#   2  usage error, or the audit could not run

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=audit-lib.sh
source "$SCRIPT_DIR/audit-lib.sh"

RUN_ID=""
REPO=""
LABEL="baseline"
REPO_PATH_OVERRIDE=""

usage() {
    cat <<EOF >&2
Usage: $0 --run-id TICKET --repo REPO [--label LABEL] [--repo-path PATH]

--label      names the saved snapshot (default: baseline); any character
             other than a letter, digit, '.', '_' or '-' becomes '_'
--repo-path  audit this checkout instead of repos/<repo>
EOF
    exit 2
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --label) LABEL="$2"; shift 2 ;;
        --repo-path) REPO_PATH_OVERRIDE="$2"; shift 2 ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$RUN_ID" ]] && usage
[[ -z "$REPO" ]] && usage
# The label names files, so anything outside [A-Za-z0-9._-] (the '@'
# and '/' of a scoped package name, say) becomes '_'.
LABEL="${LABEL//[^A-Za-z0-9._-]/_}"
[[ -z "$LABEL" ]] && usage

REPO_PATH=$(audit_resolve_repo_path "$REPO" "$REPO_PATH_OVERRIDE") || exit 2
audit_require_config "$REPO_PATH" || exit 2
CONFIG="$REPO_PATH/$AUDIT_CONFIG_FILE"

STATE_DIR=$(audit_state_dir "$RUN_ID" "$REPO")
mkdir -p "$STATE_DIR"
SNAPSHOT="$STATE_DIR/audit.${REPO}.${LABEL}.json"
SUMMARY_FILE="$STATE_DIR/audit.${REPO}.${LABEL}.summary.json"
ERR_LOG="$STATE_DIR/audit.${REPO}.${LABEL}.stderr.log"

# audit-ci exits 1 when the audit fails, which is a result here, not an
# error. Its JSON output is npm's own audit report.
AUDIT_EXIT=0
(cd "$REPO_PATH" && npx --no-install audit-ci --config "$AUDIT_CONFIG_FILE" --report-type full --output-format json) \
    >"$SNAPSHOT" 2>"$ERR_LOG" || AUDIT_EXIT=$?

if ! jq -e '.vulnerabilities | type == "object"' "$SNAPSHOT" >/dev/null 2>&1; then
    echo "audit-ci did not produce an npm audit report for $REPO (exit $AUDIT_EXIT)." >&2
    echo "Is audit-ci installed (npm ci) and the registry reachable? stderr: $ERR_LOG" >&2
    head -n 20 "$ERR_LOG" >&2 || true
    exit 2
fi

TODAY=$(audit_today)
THRESHOLD=$(jq "$AUDIT_JQ_THRESHOLD" "$CONFIG")
ADVISORIES=$(jq -c "$AUDIT_JQ_ADVISORIES" "$SNAPSHOT")
ALLOWLIST=$(jq -c --arg today "$TODAY" "$AUDIT_JQ_ALLOWLIST" "$CONFIG")

# Classify the same way audit-ci does: only advisories at or above the
# threshold count, and only entries audit-ci honours today allowlist.
CLASSIFIED=$(jq -nc \
    --argjson advisories "$ADVISORIES" \
    --argjson allowlist "$ALLOWLIST" \
    --argjson threshold "$THRESHOLD" '
    ($advisories | map(select(.severity_rank >= $threshold))) as $at
    | ($allowlist | map(select(.effective)) | map(.id)) as $honoured
    | ($at | map(.ghsa)) as $found
    | {
        failing: ($found - $honoured),
        allowlisted: ($found - ($found - $honoured)),
        stale: ($honoured - $found),
        inactive_allowlist: ($allowlist | map(select(.effective | not)) | map(.id)),
        advisories: ($at | map(del(.severity_rank)))
      }')

# Has an allowlisted advisory gained a fix since it was allowlisted, and
# does each failing one have a fix to take?
TO_CHECK=$(jq -nc --argjson c "$CLASSIFIED" '$c.advisories | map({ghsa, package, ranges})')
FIX_ROWS='[]'
if [[ "$(jq 'length' <<<"$TO_CHECK")" -gt 0 ]]; then
    FIX_ROWS=$(audit_fix_check "$REPO_PATH" <<<"$TO_CHECK") || {
        echo "Could not check the registry for fixed versions (npm view failed)." >&2
        exit 2
    }
fi

SUMMARY=$(jq -n \
    --arg repo "$REPO" \
    --arg label "$LABEL" \
    --arg snapshot "$SNAPSHOT" \
    --arg marker "$AUDIT_BLOCKED_MARKER" \
    --argjson green "$([[ "$AUDIT_EXIT" -eq 0 ]] && echo true || echo false)" \
    --argjson c "$CLASSIFIED" \
    --argjson fixes "$FIX_ROWS" \
    --argjson allowlist "$ALLOWLIST" '
    def among($ids): .ghsa as $g | any($ids[]; . == $g);
    ($fixes | map(select(among($c.allowlisted) and .fixed_version != null))
     | map(. as $f | $f + {blocked: ([$allowlist[] | select(.id == $f.ghsa) | (.notes // "")] | any(contains($marker)))})) as $with_fix
    | ($fixes | map(select(among($c.failing)))) as $failing_rows
    | {
        repo: $repo,
        label: $label,
        green: $green,
        failing: $c.failing,
        allowlisted: $c.allowlisted,
        stale: $c.stale,
        inactive_allowlist: $c.inactive_allowlist,
        fixable_allowlisted: ($with_fix | map(select(.blocked | not) | {ghsa, package, fixes, fixed_version})),
        blocked_allowlisted: ($with_fix | map(select(.blocked) | {ghsa, package, fixes, fixed_version})),
        failing_fixable: ($failing_rows | map(select(.fixed_version != null) | {ghsa, package, fixes, fixed_version})),
        failing_no_fix: ($failing_rows | map(select(.fixed_version == null) | .ghsa as $g
            | {ghsa, package, title: ($c.advisories[] | select(.ghsa == $g) | .title)})),
        advisories: $c.advisories,
        snapshot: $snapshot
      }')

echo "$SUMMARY" >"$SUMMARY_FILE"
echo "$SUMMARY"

# audit-ci's verdict is the source of truth for green. A mismatch with
# the classification above means this script misread the report.
FAILING_COUNT=$(jq '.failing | length' <<<"$SUMMARY")
if [[ "$AUDIT_EXIT" -eq 0 && "$FAILING_COUNT" -gt 0 ]] || [[ "$AUDIT_EXIT" -ne 0 && "$FAILING_COUNT" -eq 0 ]]; then
    echo "Warning: audit-ci exit $AUDIT_EXIT disagrees with $FAILING_COUNT failing advisories found here. Check $ERR_LOG." >&2
fi

if [[ "$AUDIT_EXIT" -ne 0 ]] || [[ "$(jq '.fixable_allowlisted | length' <<<"$SUMMARY")" -gt 0 ]]; then
    exit 1
fi
exit 0
