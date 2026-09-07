#!/bin/bash
# Mark a source extraction complete and print its counts.
#
# Usage:
#   extract-finalize.sh EUDPA-X --source confluence-v4 --summary "..."

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; SOURCE=""; SUMMARY=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --source) SOURCE="$2"; shift 2 ;;
        --summary) SUMMARY="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID SOURCE SUMMARY; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

target="$WORKSPACE/workareas/journey-builder/$RUN_ID/extract.$SOURCE.json"
[[ -f "$target" ]] || { echo "Error: $target not found" >&2; exit 1; }

DONE_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
# Each call writes through its own temp file: concurrent callers sharing one
# temp name rename over each other and drop items. Same directory keeps the
# mv an atomic rename; the trap clears the temp if jq fails.
tmp="$(mktemp "$target.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
jq --arg summary "$SUMMARY" --arg at "$DONE_AT" \
    '.status = "complete" | .summary = $summary | .completed_at = $at' \
    "$target" > "$tmp"
mv "$tmp" "$target"

jq -r '"extract.\(.source.id).json complete: \(.fields | length) fields, \(.pages | length) pages, \(.behaviours | length) behaviours, \(.notes | length) notes"' "$target"
