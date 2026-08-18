#!/bin/bash
# Pop the next runnable increment: first todo whose dependsOn are all done.
# Prints the increment JSON, or exits 3 when the backlog is dry (nothing
# runnable — remaining items are done, failed, blocked, or gated).
#
# Usage:
#   next-increment.sh EUDPA-X [--claim]     # --claim also sets it inprogress

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; CLAIM=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --claim) CLAIM=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-X [--claim]" >&2; exit 1; }

target="$WORKSPACE/workareas/journey-builder/$RUN_ID/backlog.json"
[[ -f "$target" ]] || { echo "Error: $target not found — run backlog-generate.sh first" >&2; exit 1; }

next=$(jq '
    (.increments | map(select(.status == "done") | .id)) as $done
    | [ .increments[]
        | select(.status == "todo")
        | select([.dependsOn[] | select(. as $d | ($done | index($d)) == null)] | length == 0)
      ]
    | first // empty' "$target")

if [[ -z "$next" ]]; then
    echo "DRY: no runnable increment" >&2
    exit 3
fi

if [[ "$CLAIM" == true ]]; then
    inc_id=$(echo "$next" | jq -r '.id')
    jq --arg id "$inc_id" '.increments |= map(if .id == $id then .status = "inprogress" else . end)' \
        "$target" > "$target.tmp" && mv "$target.tmp" "$target"
fi

echo "$next"
