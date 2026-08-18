#!/bin/bash
# Remove a question by id, renumbering all downstream ids contiguously.
#
# Usage: question-remove.sh EUDPA-XXXXX --id Q3

set -e

TICKET=""; ID=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --id) ID="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$TICKET" || -z "$ID" ]] && { echo "Usage: $0 EUDPA-XXXXX --id Q3" >&2; exit 1; }

target="$HOME/git/defra/trade-imports-workspace/workareas/understanding-checks/$TICKET/questions.json"
[[ -f "$target" ]] || { echo "Error: $target not found" >&2; exit 1; }

found=$(jq --arg id "$ID" '.questions | map(.id == $id) | any' "$target")
if [[ "$found" != "true" ]]; then
    echo "Error: question $ID not found" >&2
    exit 1
fi

jq \
    --arg id "$ID" \
    '.questions = (
        .questions
        | map(select(.id != $id))
        | to_entries
        | map(.value + { id: ("Q" + ((.key + 1) | tostring)) })
    )' \
    "$target" > "$target.tmp"
mv "$target.tmp" "$target"

echo "Removed $ID; downstream ids renumbered."
