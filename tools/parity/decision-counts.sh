#!/bin/bash
# Where the gated work stands: how much is ruled, how much is left, by gate and domain.
#
# Usage: decision-counts.sh EUDPA-X

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
RUN_ID="${1:-}"
[[ -z "$RUN_ID" ]] && { echo "Usage: $0 EUDPA-X" >&2; exit 1; }

target="$WORKSPACE/workareas/journey-builder/$RUN_ID/backlog.json"
[[ -f "$target" ]] || { echo "Error: $target not found" >&2; exit 1; }

jq -r '
    (.increments | length) as $total
    | (.increments | map(select(.decision)) | length) as $ruled
    | ([.increments[] | select(.status == "blocked") | select(.decision | not)] | length) as $undecided
    | "total: \($total)   ruled: \($ruled)   awaiting a ruling: \($undecided)\n"
    + "\nby ruling:\n"
    + ([.increments[] | select(.decision) | .decision.ruling]
        | group_by(.) | map("  \(.[0]): \(length)") | join("\n"))
    + "\n\nawaiting a ruling, by gate and domain:\n"
    + ([.increments[] | select(.status == "blocked") | select(.decision | not)]
        | group_by(.gate)
        | map("  gate " + (.[0].gate // "none") + ": " + (length | tostring) + "\n"
              + (group_by(.domain) | map("      \(.[0].domain): \(length)") | join("\n")))
        | join("\n"))
' "$target"
