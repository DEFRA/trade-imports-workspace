#!/bin/bash
# Append a new item to items.{repo}.json at the next available ID.
# Usage:
#   review-add-item.sh EUDPA-XXXXX --repo REPO --file PATH --line N --severity S \
#                      --category C --issue "..." --fix "..." [--best-practice PATH]
#   review-add-item.sh EUDPA-XXXXX --from ITEMS.json
#
# C is one of the categories in finding-categories.sh.
# Disposition, Status, and Notes start null.
# Prints the new ID to stdout.
#
# --from adds many items in one call. ITEMS.json is a list of objects with
# the same fields as the flags (best_practice for --best-practice):
#   [{"repo": "r", "file": "f", "line": 3, "severity": "Major",
#     "category": "naming", "issue": "...", "fix": "..."}]
# Prints one new ID per line, in list order. All or nothing: if any item is
# refused, none is added.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/finding-categories.sh"

TICKET=""
REPO=""
FILE=""
LINE=""
SEVERITY=""
CATEGORY=""
ISSUE=""
FIX=""
BEST_PRACTICE=""
FROM=""

usage() {
    cat <<EOF
Usage: $0 EUDPA-XXXXX --repo REPO --file PATH --line N --severity S \\
    --category C --issue "..." --fix "..." [--best-practice PATH]
       $0 EUDPA-XXXXX --from ITEMS.json
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
        --from) FROM="$2"; shift 2 ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage

if [[ -n "$FROM" ]]; then
    source "$SCRIPT_DIR/batch-lib.sh"
    batch_check_list "$FROM" || exit 1
    targets=()
    while IFS= read -r repo; do
        targets+=("$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/items.${repo}.json")
    done < <(jq -r 'map(.repo // empty) | unique[]' "$FROM")
    batch_snapshot "${targets[@]}"
    batch_run "$0" "$TICKET" "$FROM"
    exit $?
fi

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

refuse_category_outside "$CATEGORY" "${FUNCTIONAL_CATEGORIES[@]}" "${CODE_QUALITY_CATEGORIES[@]}" "${DESIGN_CATEGORIES[@]}"

target="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/items.${REPO}.json"

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
