#!/bin/bash
# Set the Status field on a review item. Disposition is left unchanged.
# Usage:
#   review-set-status.sh EUDPA-XXXXX --repo REPO --item N --status "Not Done"|"Done"|"Failed" [--note "..."]
#
# --note overwrites the Notes column when provided.

set -e

TICKET=""
REPO=""
ITEM=""
STATUS=""
NOTE=""
SET_NOTE=0

usage() {
    cat <<EOF
Usage: $0 EUDPA-XXXXX --repo REPO --item N --status VALUE [--note "..."]

  --status V     One of: "Not Done", "Done", "Failed", "—", "" (clear)
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO="$2"; shift 2 ;;
        --item) ITEM="$2"; shift 2 ;;
        --status) STATUS="$2"; shift 2 ;;
        --note) NOTE="$2"; SET_NOTE=1; shift 2 ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage
[[ -z "$REPO"   ]] && { echo "--repo required" >&2; usage; }
[[ -z "$ITEM"   ]] && { echo "--item required" >&2; usage; }

case "$STATUS" in
    "" | "Not Done" | "Done" | "Failed" | "—") ;;
    *) echo "Invalid --status: $STATUS" >&2; exit 1 ;;
esac

target="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/items.${REPO}.json"
[[ -f "$target" ]] || { echo "Items file not found: $target" >&2; exit 1; }

exists=$(jq --argjson id "$ITEM" '[.items[] | select(.id == $id)] | length' "$target")
[[ "$exists" -eq 0 ]] && { echo "Item #$ITEM not found in $target" >&2; exit 1; }

stat_json='null'
[[ -n "$STATUS" ]] && stat_json=$(jq -nc --arg v "$STATUS" '$v')

if [[ "$SET_NOTE" == "1" ]]; then
    note_json=$(jq -nc --arg v "$NOTE" 'if $v == "" then null else $v end')
    jq \
        --argjson id "$ITEM" \
        --argjson stat "$stat_json" \
        --argjson note "$note_json" \
        '.items |= map(if .id == $id then .status = $stat | .notes = $note else . end)' \
        "$target" > "$target.tmp" && mv "$target.tmp" "$target"
else
    jq \
        --argjson id "$ITEM" \
        --argjson stat "$stat_json" \
        '.items |= map(if .id == $id then .status = $stat else . end)' \
        "$target" > "$target.tmp" && mv "$target.tmp" "$target"
fi

echo "Updated #$ITEM in $REPO: Status=${STATUS:-<null>}${SET_NOTE:+, Notes set}"
