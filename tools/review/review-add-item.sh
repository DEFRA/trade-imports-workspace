#!/bin/bash
# Append a new item to items.{repo}.json at the next available ID.
# Usage:
#   review-add-item.sh EUDPA-XXXXX --repo REPO --file PATH --line N --severity S \
#                      --category C --issue "..." --fix "..." [--best-practice PATH]
#
# Disposition, Status, and Notes start null.
# Prints the new ID to stdout.

set -e

TICKET=""
REPO=""
FILE=""
LINE=""
SEVERITY=""
CATEGORY=""
ISSUE=""
FIX=""
BEST_PRACTICE=""

usage() {
    cat <<EOF
Usage: $0 EUDPA-XXXXX --repo REPO --file PATH --line N --severity S \\
    --category C --issue "..." --fix "..." [--best-practice PATH]
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO="$2"; shift 2 ;;
        --file) FILE="$2"; shift 2 ;;
        --line) LINE="$2"; shift 2 ;;
        --severity) SEVERITY="$2"; shift 2 ;;
        --category) CATEGORY="$2"; shift 2 ;;
        --issue) ISSUE="$2"; shift 2 ;;
        --fix) FIX="$2"; shift 2 ;;
        --best-practice) BEST_PRACTICE="$2"; shift 2 ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage
for var in REPO FILE LINE SEVERITY CATEGORY ISSUE FIX; do
    if [[ -z "${!var}" ]]; then
        lc=$(printf '%s' "$var" | tr '[:upper:]' '[:lower:]')
        echo "--$lc required" >&2
        usage
    fi
done

case "$SEVERITY" in
    Critical|Major|Minor) ;;
    *) echo "Invalid --severity: $SEVERITY (must be Critical|Major|Minor)" >&2; exit 1 ;;
esac

target="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/items.${REPO}.json"

# Initialise if missing so callers don't have to know.
if [[ ! -f "$target" ]]; then
    jq -n --arg ticket "$TICKET" --arg repo "$REPO" \
        '{ticket: $ticket, repo: $repo, items: []}' > "$target"
fi

next_id=$(jq '(.items | map(.id) | max // 0) + 1' "$target")

jq \
    --argjson id "$next_id" \
    --arg file "$FILE" \
    --arg line "$LINE" \
    --arg severity "$SEVERITY" \
    --arg category "$CATEGORY" \
    --arg issue "$ISSUE" \
    --arg fix "$FIX" \
    --arg best_practice "$BEST_PRACTICE" \
    '.items += [({
        id: $id,
        file: $file,
        line: $line,
        severity: $severity,
        category: $category,
        issue: $issue,
        fix: $fix,
        disposition: null,
        status: null,
        notes: null
    } + (if $best_practice != "" then {best_practice: $best_practice} else {} end))]' \
    "$target" > "$target.tmp" && mv "$target.tmp" "$target"

echo "$next_id"
