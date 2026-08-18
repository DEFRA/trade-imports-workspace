#!/bin/bash
# List items from items.{repo}.json files for a ticket.
# Usage:
#   style-items.sh EUDPA-XXXXX [--repo REPO] [--file PATH]
#                              [--filter pending|fix|wont-fix|discuss|auto-resolved]
#                              [--status not-done|done|failed] [--by-file] [--json]
#
# TSV output columns (in this order):
#   repo \t id \t file \t line \t rule \t severity \t issue \t fix \t disposition \t status \t notes
#
# --by-file groups items by (repo, file) and emits JSON groups (implies --json).
# Filters narrow the result set. Multiple filters AND together.

set -e

TICKET=""
REPO_FILTER=""
FILE_FILTER=""
DISPOSITION_FILTER=""
STATUS_FILTER=""
JSON_OUTPUT=false
BY_FILE=false

usage() {
    cat <<EOF
Usage: $0 EUDPA-XXXXX [--repo REPO] [--file PATH] [--filter DISPOSITION] [--status STATUS] [--by-file] [--json]

  --repo R         Limit to one repo
  --file P         Limit to items for one file (exact path match)
  --filter F       Filter by Disposition: pending|fix|wont-fix|discuss|auto-resolved
  --status S       Filter by Status: not-done|done|failed
  --by-file        Group items by (repo, file) — implies --json
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
        --by-file) BY_FILE=true; JSON_OUTPUT=true; shift ;;
        --json) JSON_OUTPUT=true; shift ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && usage

STYLE_DIR="$HOME/git/defra/trade-imports-workspace/workareas/code-style-reviews/$TICKET"
[[ -d "$STYLE_DIR" ]] || { echo "Style review workspace not found: $STYLE_DIR" >&2; exit 1; }

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
    f="$STYLE_DIR/items.${REPO_FILTER}.json"
    [[ -f "$f" ]] && files+=("$f")
else
    while IFS= read -r f; do files+=("$f"); done < <(find "$STYLE_DIR" -maxdepth 1 -name 'items.*.json' | sort)
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

if [[ "$BY_FILE" == "true" ]]; then
    echo "$filtered" | jq 'group_by([.repo, .file]) | map({repo: .[0].repo, file: .[0].file, items: .})'
elif [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$filtered"
else
    echo "$filtered" | jq -r '.[] |
        [
            .repo,
            (.id | tostring),
            .file,
            (.line // ""),
            (.rule // ""),
            (.severity // ""),
            (.issue // ""),
            (.fix // ""),
            (.disposition // ""),
            (.status // ""),
            (.notes // "")
        ] | @tsv'
fi
