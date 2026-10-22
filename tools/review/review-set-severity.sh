#!/bin/bash
# Set the Severity field on a review item. Disposition and Status are left unchanged.
# Usage:
#   review-set-severity.sh EUDPA-XXXXX --repo REPO --item N --severity Critical|Major|Minor [--note "..."]
#
# For when triage re-grades a finding: a coverage-gap that turns out to be a live
# behaviour regression, say. Without this the severity in items.json disagrees with
# the decision on the record, and render-items.sh keeps showing the stale grade.
#
# --note overwrites the Notes column when provided.

set -e

TICKET=""
REPO=""
ITEM=""
SEVERITY=""
NOTE=""
SET_NOTE=0

usage() {
    cat <<EOF
Usage: $0 EUDPA-XXXXX --repo REPO --item N --severity VALUE [--note "..."]

  --severity V   One of: Critical, Major, Minor
  --note "..."   Overwrites the Notes column when provided
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO="$2"; shift 2 ;;
        --item) ITEM="$2"; shift 2 ;;
        --severity) SEVERITY="$2"; shift 2 ;;
        --note) NOTE="$2"; SET_NOTE=1; shift 2 ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

if [[ -z "$TICKET" ]]; then usage; fi
if [[ -z "$REPO" ]]; then echo "--repo required" >&2; usage; fi
if [[ -z "$ITEM" ]]; then echo "--item required" >&2; usage; fi

case "$SEVERITY" in
    "Critical" | "Major" | "Minor") ;;
    *) echo "Invalid --severity: $SEVERITY (expected Critical, Major or Minor)" >&2; exit 1 ;;
esac

target="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/items.${REPO}.json"
if [[ ! -f "$target" ]]; then echo "Items file not found: $target" >&2; exit 1; fi

exists=$(jq --argjson id "$ITEM" '[.items[] | select(.id == $id)] | length' "$target")
if [[ "$exists" -eq 0 ]]; then echo "Item #$ITEM not found in $target" >&2; exit 1; fi

was=$(jq -r --argjson id "$ITEM" '.items[] | select(.id == $id) | .severity' "$target")

if [[ "$SET_NOTE" == "1" ]]; then
    note_json=$(jq -nc --arg v "$NOTE" 'if $v == "" then null else $v end')
    jq \
        --argjson id "$ITEM" \
        --arg sev "$SEVERITY" \
        --argjson note "$note_json" \
        '.items |= map(if .id == $id then .severity = $sev | .notes = $note else . end)' \
        "$target" > "$target.tmp"
else
    jq \
        --argjson id "$ITEM" \
        --arg sev "$SEVERITY" \
        '.items |= map(if .id == $id then .severity = $sev else . end)' \
        "$target" > "$target.tmp"
fi
mv "$target.tmp" "$target"

echo "Updated #$ITEM in $REPO: Severity=$was -> $SEVERITY${SET_NOTE:+, Notes set}"
