#!/bin/bash
# Append a todo to a per-file review JSON. Auto-assigns next id.
# Usage:
#   file-review-add-item.sh EUDPA-X --repo R --file F \
#       --line L --severity S --category C \
#       --issue "..." --fix "..." [--best-practice PATH]
# Prints the new id.

set -e

TICKET=""; REPO=""; FILE=""; LINE=""; SEVERITY=""; CATEGORY=""
ISSUE=""; FIX=""; BEST_PRACTICE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --repo) REPO="$2"; shift 2 ;;
        --file) FILE="$2"; shift 2 ;;
        --line) LINE="$2"; shift 2 ;;
        --severity) SEVERITY="$2"; shift 2 ;;
        --category) CATEGORY="$2"; shift 2 ;;
        --issue) ISSUE="$2"; shift 2 ;;
        --fix) FIX="$2"; shift 2 ;;
        --best-practice) BEST_PRACTICE="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in TICKET REPO FILE LINE SEVERITY CATEGORY ISSUE FIX; do
    [[ -z "${!v}" ]] && { echo "Missing $v" >&2; exit 1; }
done

case "$SEVERITY" in
    Critical|Major|Minor) ;;
    *) echo "Invalid severity: $SEVERITY (must be Critical|Major|Minor)" >&2; exit 1 ;;
esac

encoded="${FILE//\//_}"
target="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/file-reviews/$REPO/$encoded.review.json"
[[ -f "$target" ]] || { echo "No review file at $target — call file-review-init.sh first" >&2; exit 1; }

next_id=$(jq '(.todos | map(.id) | max // 0) + 1' "$target")

jq \
    --argjson id "$next_id" \
    --argjson line "$LINE" \
    --arg severity "$SEVERITY" \
    --arg category "$CATEGORY" \
    --arg issue "$ISSUE" \
    --arg fix "$FIX" \
    --arg best_practice "$BEST_PRACTICE" \
    '.todos += [({
        id: $id,
        line: $line,
        severity: $severity,
        category: $category,
        issue: $issue,
        fix: $fix
    } + (if $best_practice != "" then {best_practice: $best_practice} else {} end))]' \
    "$target" > "$target.tmp" && mv "$target.tmp" "$target"

echo "$next_id"
