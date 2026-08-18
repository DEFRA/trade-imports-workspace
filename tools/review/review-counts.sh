#!/bin/bash
# Summary counts for review items in a ticket workspace.
# Usage:
#   review-counts.sh EUDPA-XXXXX [--repo REPO] [--json]

set -e

TICKET=""
REPO=""
JSON_OUTPUT=false

usage() {
    echo "Usage: $0 EUDPA-XXXXX [--repo REPO] [--json]" >&2
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO="$2"; shift 2 ;;
        --json) JSON_OUTPUT=true; shift ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage

REVIEW_DIR="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"
[[ -d "$REVIEW_DIR" ]] || { echo "Review workspace not found: $REVIEW_DIR" >&2; exit 1; }

files=()
if [[ -n "$REPO" ]]; then
    f="$REVIEW_DIR/items.${REPO}.json"
    [[ -f "$f" ]] && files+=("$f")
else
    while IFS= read -r f; do files+=("$f"); done < <(find "$REVIEW_DIR" -maxdepth 1 -name 'items.*.json' | sort)
fi

if [[ ${#files[@]} -eq 0 ]]; then
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        echo '{"breakdown":[],"total":0}'
    else
        echo "Counts for $TICKET${REPO:+ (repo: $REPO)}:"
        echo "  ----"
        echo "     0  TOTAL"
    fi
    exit 0
fi

summary=$(jq -s '
    [.[] | .items[] | {
        disposition: (.disposition // "Pending"),
        status: (.status // "")
    }]
    | group_by([.disposition, .status])
    | map({
        disposition: .[0].disposition,
        status: .[0].status,
        count: length
    })
    | sort_by(.disposition, .status)
    | {breakdown: ., total: (map(.count) | add // 0)}
' "${files[@]}")

if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$summary"
else
    echo "Counts for $TICKET${REPO:+ (repo: $REPO)}:"
    echo "$summary" | jq -r '.breakdown[] | [.count, .disposition, (.status // "" | if . == "" then "—" else . end)] | @tsv' \
        | while IFS=$'\t' read -r count disposition status; do
            printf '  %4d  %-15s  %s\n' "$count" "$disposition" "$status"
        done
    echo "  ----"
    total=$(echo "$summary" | jq -r '.total')
    printf '  %4d  TOTAL\n' "$total"
fi
