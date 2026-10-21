#!/bin/bash
# Append a todo to a per-file style review JSON. Auto-assigns next id.
# Usage:
#   file-style-add-item.sh ID --repo R --file F \
#       --line L --rule R --category C --severity S \
#       --issue "..." --fix "..." [--best-practice PATH]
#
# C is one of CODE_QUALITY_CATEGORIES or DESIGN_CATEGORIES in ../review/finding-categories.sh.
#
# ID is the ticket (EUDPA-X) or, in local mode, the composite
# local/<repo>/<branch> id — any non-flag first argument is accepted.
#
# Prints the new id.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../review/finding-categories.sh"

TICKET=""; REPO=""; FILE=""; LINE=""; RULE=""; CATEGORY=""; SEVERITY=""
ISSUE=""; FIX=""; BEST_PRACTICE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo) REPO="$2"; shift 2 ;;
        --file) FILE="$2"; shift 2 ;;
        --line) LINE="$2"; shift 2 ;;
        --rule) RULE="$2"; shift 2 ;;
        --category) CATEGORY="$2"; shift 2 ;;
        --severity) SEVERITY="$2"; shift 2 ;;
        --issue) ISSUE="$2"; shift 2 ;;
        --fix) FIX="$2"; shift 2 ;;
        --best-practice) BEST_PRACTICE="$2"; shift 2 ;;
        -*) echo "Unknown arg: $1" >&2; exit 1 ;;
        *) TICKET="$1"; shift ;;
    esac
done

for v in TICKET REPO FILE RULE CATEGORY SEVERITY ISSUE FIX; do
    [[ -z "${!v}" ]] && { echo "Missing $v" >&2; exit 1; }
done

case "$SEVERITY" in
    FAIL|WARN) ;;
    *) echo "Invalid severity: $SEVERITY (must be FAIL|WARN)" >&2; exit 1 ;;
esac

refuse_category_outside "$CATEGORY" "${CODE_QUALITY_CATEGORIES[@]}" "${DESIGN_CATEGORIES[@]}"

encoded="${FILE//\//_}"
target="$HOME/git/defra/trade-imports-workspace/workareas/code-style-reviews/$TICKET/file-reviews/$REPO/$encoded.style.json"
[[ -f "$target" ]] || { echo "No style file at $target — call file-style-init.sh first" >&2; exit 1; }

next_id=$(jq '(.todos | map(.id) | max // 0) + 1' "$target")

jq \
    --argjson id "$next_id" \
    --arg line "$LINE" \
    --arg rule "$RULE" \
    --arg category "$CATEGORY" \
    --arg severity "$SEVERITY" \
    --arg issue "$ISSUE" \
    --arg fix "$FIX" \
    --arg best_practice "$BEST_PRACTICE" \
    '.todos += [({
        id: $id,
        line: $line,
        rule: $rule,
        category: $category,
        severity: $severity,
        issue: $issue,
        fix: $fix
    } + (if $best_practice != "" then {best_practice: $best_practice} else {} end))]' \
    "$target" > "$target.tmp" && mv "$target.tmp" "$target"

echo "$next_id"
