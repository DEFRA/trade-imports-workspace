#!/bin/bash
# Write or renew one audit-ci allowlist entry in a repo's audit-ci.jsonc.
#
# Usage:
#   audit-allowlist-add.sh --run-id TICKET --repo REPO --ghsa GHSA-xxxx-xxxx-xxxx \
#       --reason "..." --owner "Name" --expiry-days N \
#       [--blocked-by "<parent that pins the vulnerable range>"] \
#       [--stage N] [--repo-path PATH]
#
# Writes the entry in the one shape every repo's CI "Check audit
# allowlist" step accepts:
#
#   {"GHSA-…": {"active": true, "notes": "<reason>. Owner: <owner>", "expiry": "YYYY-MM-DD"}}
#
# An existing entry for the same GHSA is replaced in place (a renewal).
#
# It refuses:
#   - an expiry more than 3 calendar months from today, which CI would
#     reject anyway
#   - a GHSA the repo's current audit does not report
#   - an advisory that has a fixed version (a published version newer
#     than the installed one and outside every vulnerable range), unless
#     --blocked-by names the parent that stops the repo taking it. The
#     notes then read "<reason>. Fix blocked upstream: <blocked-by>.
#     Owner: <owner>", which audit-baseline.sh reads to tell a blocked
#     fix from one nobody has taken.
#
# It records the entry, with its kind (no_fix | fix_blocked_upstream),
# added_at and stage, in
#   workareas/npm-upgrades/{run-id}/{repo}/allowlist.{repo}.json
#
# It does not stage or commit anything.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=audit-lib.sh
source "$SCRIPT_DIR/audit-lib.sh"

RUN_ID=""
REPO=""
GHSA=""
REASON=""
OWNER=""
EXPIRY_DAYS=""
BLOCKED_BY=""
STAGE=""
REPO_PATH_OVERRIDE=""

usage() {
    cat <<EOF >&2
Usage: $0 --run-id TICKET --repo REPO --ghsa GHSA-xxxx-xxxx-xxxx \\
    --reason "..." --owner "Name" --expiry-days N \\
    [--blocked-by "parent pins the vulnerable range"] [--stage N] [--repo-path PATH]
EOF
    exit 2
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --ghsa) GHSA="$2"; shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        --owner) OWNER="$2"; shift 2 ;;
        --expiry-days) EXPIRY_DAYS="$2"; shift 2 ;;
        --blocked-by) BLOCKED_BY="$2"; shift 2 ;;
        --stage) STAGE="$2"; shift 2 ;;
        --repo-path) REPO_PATH_OVERRIDE="$2"; shift 2 ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

for required in RUN_ID REPO GHSA REASON OWNER EXPIRY_DAYS; do
    [[ -z "${!required}" ]] && { echo "Missing --$(tr 'A-Z_' 'a-z-' <<<"$required")" >&2; usage; }
done

[[ "$GHSA" =~ $AUDIT_GHSA_PATTERN ]] || { echo "--ghsa must look like GHSA-xxxx-xxxx-xxxx (lower case): $GHSA" >&2; exit 2; }
[[ "$EXPIRY_DAYS" =~ ^[1-9][0-9]*$ ]] || { echo "--expiry-days must be a whole number of days, 1 or more" >&2; exit 2; }
[[ -z "$STAGE" || "$STAGE" =~ ^[0-9]+$ ]] || { echo "--stage must be a number" >&2; exit 2; }
if [[ "$REASON" == *"Owner:"* || "$REASON" == *"$AUDIT_BLOCKED_MARKER"* ]]; then
    echo "--reason must not contain 'Owner:' or '$AUDIT_BLOCKED_MARKER'. Pass them as --owner and --blocked-by." >&2
    exit 2
fi

REPO_PATH=$(audit_resolve_repo_path "$REPO" "$REPO_PATH_OVERRIDE") || exit 2
audit_require_config "$REPO_PATH" || exit 2
CONFIG="$REPO_PATH/$AUDIT_CONFIG_FILE"

# Expiry: never further out than CI allows (3 calendar months).
EXPIRY=$(audit_date_from_today "$EXPIRY_DAYS" days)
LIMIT=$(audit_date_from_today 3 months)
if [[ "$EXPIRY" > "$LIMIT" ]]; then
    echo "Refusing: expiry $EXPIRY is more than 3 months away (latest allowed $LIMIT). Use a smaller --expiry-days." >&2
    exit 1
fi

# The advisory must be in the repo's current audit, at any severity.
REPORT=$(cd "$REPO_PATH" && npm audit --json 2>/dev/null) || true
if ! jq -e '.vulnerabilities | type == "object"' <<<"$REPORT" >/dev/null 2>&1; then
    echo "npm audit did not produce a report in $REPO_PATH. Is the registry reachable?" >&2
    exit 2
fi
ADVISORY=$(jq -c --arg g "$GHSA" "$AUDIT_JQ_ADVISORIES | map(select(.ghsa == \$g)) | first // empty" <<<"$REPORT")
if [[ -z "$ADVISORY" ]]; then
    echo "Refusing: $GHSA is not in $REPO's current audit. Nothing to allowlist." >&2
    exit 1
fi
PACKAGE=$(jq -r '.package' <<<"$ADVISORY")

FIX=$(jq -c '[{ghsa, package, ranges}]' <<<"$ADVISORY" | audit_fix_check "$REPO_PATH") || {
    echo "Could not check the registry for a fixed version of $PACKAGE (npm view failed)." >&2
    exit 2
}
FIXED_VERSION=$(jq -r '.[0].fixed_version // empty' <<<"$FIX")
FIXES=$(jq -r '.[0].fixes | map("\(.installed) -> \(.fixed)") | join(", ")' <<<"$FIX")

KIND="no_fix"
if [[ -n "$FIXED_VERSION" ]]; then
    if [[ -z "$BLOCKED_BY" ]]; then
        echo "Refusing: $GHSA ($PACKAGE) has a fixed version ($FIXES)." >&2
        echo "Take the fix. If a parent package stops you, pass --blocked-by naming it." >&2
        exit 1
    fi
    KIND="fix_blocked_upstream"
elif [[ -n "$BLOCKED_BY" ]]; then
    echo "Note: $GHSA has no fixed version, so --blocked-by is not recorded (kind no_fix)." >&2
    BLOCKED_BY=""
fi

NOTES="${REASON%.}."
[[ -n "$BLOCKED_BY" ]] && NOTES="$NOTES $AUDIT_BLOCKED_MARKER ${BLOCKED_BY%.}."
NOTES="$NOTES Owner: $OWNER"

ENTRY=$(jq -nc --arg id "$GHSA" --arg notes "$NOTES" --arg expiry "$EXPIRY" \
    '{($id): {active: true, notes: $notes, expiry: $expiry}}')

# Replace an existing entry for the GHSA in place, or append one.
jq --arg id "$GHSA" --argjson entry "$ENTRY" '
    def entry_id: if type == "string" then . else (keys[0]) end;
    if any(.allowlist[]; entry_id == $id)
    then .allowlist |= map(if entry_id == $id then $entry else . end)
    else .allowlist += [$entry]
    end' "$CONFIG" >"$CONFIG.tmp"
mv "$CONFIG.tmp" "$CONFIG"

# Record it in the run's state, keeping the first added_at on renewal.
STATE_DIR=$(audit_state_dir "$RUN_ID" "$REPO")
mkdir -p "$STATE_DIR"
STATE_FILE="$STATE_DIR/allowlist.${REPO}.json"
[[ -f "$STATE_FILE" ]] || jq -n --arg t "$RUN_ID" --arg r "$REPO" '{ticket: $t, repo: $r, entries: []}' >"$STATE_FILE"

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
jq --arg ghsa "$GHSA" \
    --arg package "$PACKAGE" \
    --arg kind "$KIND" \
    --arg blocked_by "$BLOCKED_BY" \
    --arg fixed_version "$FIXED_VERSION" \
    --arg reason "${REASON%.}" \
    --arg owner "$OWNER" \
    --arg notes "$NOTES" \
    --arg expiry "$EXPIRY" \
    --arg now "$NOW" \
    --arg stage "$STAGE" '
    (.entries | map(select(.ghsa == $ghsa)) | first) as $prior
    | .entries = (.entries | map(select(.ghsa != $ghsa))) + [{
        ghsa: $ghsa,
        package: $package,
        kind: $kind,
        blocked_by: (if $blocked_by == "" then null else $blocked_by end),
        fixed_version: (if $fixed_version == "" then null else $fixed_version end),
        reason: $reason,
        owner: $owner,
        notes: $notes,
        expiry: $expiry,
        added_at: ($prior.added_at // $now),
        stage: (if $prior then $prior.stage elif $stage == "" then null else ($stage | tonumber) end),
        renewed_at: (if $prior then $now else null end),
        renewed_stage: (if $prior and $stage != "" then ($stage | tonumber) else null end)
      }]' "$STATE_FILE" >"$STATE_FILE.tmp"
mv "$STATE_FILE.tmp" "$STATE_FILE"

jq -n --arg repo "$REPO" --arg kind "$KIND" --argjson entry "$ENTRY" \
    '{repo: $repo, kind: $kind, entry: $entry}'
