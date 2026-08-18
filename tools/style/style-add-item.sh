#!/bin/bash
# Append a new item to items.{repo}.json at the next available ID.
# Usage:
#   style-add-item.sh EUDPA-XXXXX --repo REPO --file PATH --line N --rule R --severity S \
#                     --issue "..." --fix "..." [--best-practice PATH]
#
# Disposition, Status, and Notes start null.
# Prints the new ID to stdout.

set -e

TICKET=""
REPO=""
FILE=""
LINE=""
RULE=""
SEVERITY=""
ISSUE=""
FIX=""
BEST_PRACTICE=""

usage() {
    cat <<EOF
Usage: $0 EUDPA-XXXXX --repo REPO --file PATH --line N --rule R --severity S \\
    --issue "..." --fix "..." [--best-practice PATH]

  --rule R        Style guide rule number (1-17)
  --severity S    One of: FAIL, WARN
  --best-practice Optional citation path under docs/best-practices/
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO="$2"; shift 2 ;;
        --file) FILE="$2"; shift 2 ;;
        --line) LINE="$2"; shift 2 ;;
        --rule) RULE="$2"; shift 2 ;;
        --severity) SEVERITY="$2"; shift 2 ;;
        --issue) ISSUE="$2"; shift 2 ;;
        --fix) FIX="$2"; shift 2 ;;
        --best-practice) BEST_PRACTICE="$2"; shift 2 ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage
# LINE may legitimately be empty; the rest are required.
for var in REPO FILE RULE SEVERITY ISSUE FIX; do
    if [[ -z "${!var}" ]]; then
        lc=$(printf '%s' "$var" | tr '[:upper:]' '[:lower:]')
        echo "--$lc required" >&2
        usage
    fi
done

case "$SEVERITY" in
    FAIL|WARN) ;;
    *) echo "Invalid --severity: $SEVERITY (must be FAIL|WARN)" >&2; exit 1 ;;
esac

target="$HOME/git/defra/trade-imports-workspace/workareas/code-style-reviews/$TICKET/items.${REPO}.json"

# Initialise if missing so callers don't have to know.
if [[ ! -f "$target" ]]; then
    mkdir -p "$(dirname "$target")"
    jq -n --arg ticket "$TICKET" --arg repo "$REPO" \
        '{ticket: $ticket, repo: $repo, items: []}' > "$target"
fi

next_id=$(jq '(.items | map(.id) | max // 0) + 1' "$target")

jq \
    --argjson id "$next_id" \
    --arg file "$FILE" \
    --arg line "$LINE" \
    --arg rule "$RULE" \
    --arg severity "$SEVERITY" \
    --arg issue "$ISSUE" \
    --arg fix "$FIX" \
    --arg best_practice "$BEST_PRACTICE" \
    '.items += [({
        id: $id,
        file: $file,
        line: $line,
        rule: $rule,
        severity: $severity,
        issue: $issue,
        fix: $fix,
        disposition: null,
        status: null,
        notes: null
    } + (if $best_practice != "" then {best_practice: $best_practice} else {} end))]' \
    "$target" > "$target.tmp" && mv "$target.tmp" "$target"

echo "$next_id"
