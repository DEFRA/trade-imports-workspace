#!/bin/bash
# List items from items.{repo}.json files for a ticket.
# Usage:
#   review-items.sh EUDPA-XXXXX [--repo REPO] [--filter pending|fix|wont-fix|discuss|auto-resolved]
#                                [--status not-done|done|failed] [--json]
#
# TSV output columns (in this order):
#   repo \t id \t file \t line \t severity \t category \t issue \t fix \t disposition \t status \t notes
#
# Filters narrow the result set. Multiple filters AND together. JSON output is an array.

set -e

TICKET=""
REPO_FILTER=""
DISPOSITION_FILTER=""
STATUS_FILTER=""
FILE_FILTER=""
JSON_OUTPUT=false

usage() {
    cat <<EOF
Usage: $0 EUDPA-XXXXX [--repo REPO] [--file PATH] [--filter DISPOSITION] [--status STATUS] [--json]

  --repo R         Limit to one repo
  --file P         Limit to items for one file (exact path match)
  --filter F       Filter by Disposition: pending|fix|wont-fix|discuss|auto-resolved
  --status S       Filter by Status: not-done|done|failed
  --json           Output JSON array instead of TSV
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO_FILTER="$2"; shift 2 ;;
        --file) FILE_FILTER="$2"; shift 2 ;;
        --filter) DISPOSITION_FILTER="$2"; shift 2 ;;
        --status) STATUS_FILTER="$2"; shift 2 ;;
        --json) JSON_OUTPUT=true; shift ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage

REVIEW_DIR="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"
[[ -d "$REVIEW_DIR" ]] || { echo "Review workspace not found: $REVIEW_DIR" >&2; exit 1; }

disposition_label() {
    case "$1" in
        pending) echo "" ;;
        fix) echo "Fix" ;;
        wont-fix) echo "Won't Fix" ;;
        discuss) echo "Discuss" ;;
        auto-resolved) echo "Auto-Resolved" ;;
        *) echo "Invalid --filter: $1" >&2; exit 1 ;;
    esac
}

status_label() {
    case "$1" in
        not-done) echo "Not Done" ;;
        done) echo "Done" ;;
        failed) echo "Failed" ;;
        *) echo "Invalid --status: $1" >&2; exit 1 ;;
    esac
}

DISPOSITION_MATCH=""
STATUS_MATCH=""
[[ -n "$DISPOSITION_FILTER" ]] && DISPOSITION_MATCH=$(disposition_label "$DISPOSITION_FILTER")
[[ -n "$STATUS_FILTER" ]] && STATUS_MATCH=$(status_label "$STATUS_FILTER")

files=()
if [[ -n "$REPO_FILTER" ]]; then
    f="$REVIEW_DIR/items.${REPO_FILTER}.json"
    [[ -f "$f" ]] && files+=("$f")
else
    while IFS= read -r f; do files+=("$f"); done < <(find "$REVIEW_DIR" -maxdepth 1 -name 'items.*.json' | sort)
fi

[[ ${#files[@]} -eq 0 ]] && exit 0

filtered=$(jq -s \
    --arg disp_filter "$DISPOSITION_FILTER" \
    --arg disp_match "$DISPOSITION_MATCH" \
    --arg stat_filter "$STATUS_FILTER" \
    --arg stat_match "$STATUS_MATCH" \
    --arg file_filter "$FILE_FILTER" \
    '
    [.[] as $f
        | $f.items[]
        | . + {repo: $f.repo}
        | select(
            ($disp_filter == "" or (.disposition // "") == $disp_match) and
            ($stat_filter == "" or (.status // "") == $stat_match) and
            ($file_filter == "" or .file == $file_filter)
          )
    ]' "${files[@]}")

if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$filtered"
else
    echo "$filtered" | jq -r '.[] |
        [
            .repo,
            (.id | tostring),
            .file,
            (.line // ""),
            (.severity // ""),
            (.category // ""),
            (.issue // ""),
            (.fix // ""),
            (.disposition // ""),
            (.status // ""),
            (.notes // "")
        ] | @tsv'
fi
