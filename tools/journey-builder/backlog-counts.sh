#!/bin/bash
# Backlog summary: counts by milestone x status.
#
# Usage:
#   backlog-counts.sh EUDPA-X [--json]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; AS_JSON=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --json) AS_JSON=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-X [--json]" >&2; exit 1; }

target="$WORKSPACE/workareas/journey-builder/$RUN_ID/backlog.json"
[[ -f "$target" ]] || { echo "Error: $target not found" >&2; exit 1; }

if [[ "$AS_JSON" == true ]]; then
    jq '{
        total: (.increments | length),
        by_status: (.increments | group_by(.status) | map({key: .[0].status, value: length}) | from_entries),
        by_milestone: (.increments | group_by(.milestone) | map({key: .[0].milestone, value: (group_by(.status) | map({key: .[0].status, value: length}) | from_entries)}) | from_entries)
    }' "$target"
else
    jq -r '
        (.increments | length) as $total
        | "total: \($total)",
          (.increments | group_by(.milestone)[] |
            "\(.[0].milestone): " + (group_by(.status) | map("\(length) \(.[0].status)") | join(", ")))' "$target"
fi
