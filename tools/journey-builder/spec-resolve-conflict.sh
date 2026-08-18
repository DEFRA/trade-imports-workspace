#!/bin/bash
# Stamp a resolution onto a conflict (gate-session helper).
#
# Usage:
#   spec-resolve-conflict.sh EUDPA-X --id c-003 --resolution "..." --resolved-by "..."

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; ID=""; RESOLUTION=""; RESOLVED_BY=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --id) ID="$2"; shift 2 ;;
        --resolution) RESOLUTION="$2"; shift 2 ;;
        --resolved-by) RESOLVED_BY="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID ID RESOLUTION RESOLVED_BY; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
target="$(jq -r '.spec_dir' "$meta")/conflicts.json"

exists=$(jq --arg id "$ID" '[.conflicts[] | select(.id == $id)] | length' "$target")
[[ "$exists" -eq 0 ]] && { echo "Error: conflict '$ID' not found" >&2; exit 1; }

jq --arg id "$ID" --arg res "$RESOLUTION" --arg by "$RESOLVED_BY" \
    '.conflicts |= map(if .id == $id then .resolution = $res | .resolvedBy = $by else . end)' \
    "$target" > "$target.tmp" && mv "$target.tmp" "$target"

echo "Resolved $ID"
