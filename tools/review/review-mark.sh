#!/bin/bash
# Set the Disposition (and corresponding Status) on a review item.
# Usage:
#   review-mark.sh EUDPA-XXXXX --repo REPO --item N --disposition "Fix"|"Won't Fix"|"Discuss"|"Auto-Resolved"|"Merged" [--note "..."]
#
# Auto-sets Status:
#   Fix             → "Not Done"
#   Discuss         → "Not Done"
#   Won't Fix       → "—"
#   Auto-Resolved   → "—"
#   Merged          → "—"
#   (cleared)       → null
#
# --note overwrites the Notes column. Without --note, Notes is left as-is.
# Merged needs --note "merged into #N", naming the owner item.

set -e

TICKET=""
REPO=""
ITEM=""
DISPOSITION=""
NOTE=""
SET_NOTE=0

usage() {
    cat <<EOF
Usage: $0 EUDPA-XXXXX --repo REPO --item N --disposition VALUE [--note "..."]

  --disposition V   One of: Fix, "Won't Fix", Discuss, Auto-Resolved, Merged, "" (clear)
  --note "..."      Required with Merged: "merged into #N"
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO="$2"; shift 2 ;;
        --item) ITEM="$2"; shift 2 ;;
        --disposition) DISPOSITION="$2"; shift 2 ;;
        --note) NOTE="$2"; SET_NOTE=1; shift 2 ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage
[[ -z "$REPO"   ]] && { echo "--repo required" >&2; usage; }
[[ -z "$ITEM"   ]] && { echo "--item required" >&2; usage; }

case "$DISPOSITION" in
    "" | "Fix" | "Won't Fix" | "Discuss" | "Auto-Resolved" | "Merged") ;;
    *) echo "Invalid --disposition: $DISPOSITION" >&2; exit 1 ;;
esac

if [[ "$DISPOSITION" == "Merged" ]] && [[ ! "$NOTE" =~ ^merged\ into\ \#[0-9]+$ ]]; then
    echo "Merged needs --note \"merged into #N\", naming the owner item." >&2
    exit 1
fi

case "$DISPOSITION" in
    "Fix" | "Discuss") STATUS="Not Done" ;;
    "Won't Fix" | "Auto-Resolved" | "Merged") STATUS="—" ;;
    "") STATUS="" ;;
esac

target="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/items.${REPO}.json"
[[ -f "$target" ]] || { echo "Items file not found: $target" >&2; exit 1; }

# Verify item exists.
exists=$(jq --argjson id "$ITEM" '[.items[] | select(.id == $id)] | length' "$target")
[[ "$exists" -eq 0 ]] && { echo "Item #$ITEM not found in $target" >&2; exit 1; }

# Treat empty strings as null in the JSON (so blank Disposition is null, not "").
disp_json='null'
[[ -n "$DISPOSITION" ]] && disp_json=$(jq -nc --arg v "$DISPOSITION" '$v')
stat_json='null'
[[ -n "$STATUS" ]] && stat_json=$(jq -nc --arg v "$STATUS" '$v')

if [[ "$SET_NOTE" == "1" ]]; then
    note_json=$(jq -nc --arg v "$NOTE" 'if $v == "" then null else $v end')
    jq \
        --argjson id "$ITEM" \
        --argjson disp "$disp_json" \
        --argjson stat "$stat_json" \
        --argjson note "$note_json" \
        '.items |= map(if .id == $id then .disposition = $disp | .status = $stat | .notes = $note else . end)' \
        "$target" > "$target.tmp" && mv "$target.tmp" "$target"
else
    jq \
        --argjson id "$ITEM" \
        --argjson disp "$disp_json" \
        --argjson stat "$stat_json" \
        '.items |= map(if .id == $id then .disposition = $disp | .status = $stat else . end)' \
        "$target" > "$target.tmp" && mv "$target.tmp" "$target"
fi

echo "Marked #$ITEM in $REPO: Disposition=${DISPOSITION:-<null>}, Status=${STATUS:-<null>}${SET_NOTE:+, Notes set}"
