#!/bin/bash
# Append a journey-level behaviour (canvas-derived) to journey-spec.json.
#
# Usage:
#   spec-add-behaviour.sh EUDPA-X --id delete-on-change --source ixd-canvas \
#       --status adopted|open-question --detail "..."

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; ID=""; SOURCE=""; STATUS=""; DETAIL=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --id) ID="$2"; shift 2 ;;
        --source) SOURCE="$2"; shift 2 ;;
        --status) STATUS="$2"; shift 2 ;;
        --detail) DETAIL="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID ID SOURCE STATUS DETAIL; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done
case "$STATUS" in
    adopted|open-question) ;;
    *) echo "Error: --status must be adopted|open-question" >&2; exit 1 ;;
esac

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec="$(jq -r '.spec_dir' "$meta")/journey-spec.json"

dupe=$(jq --arg id "$ID" '[.behaviours[] | select(.id == $id)] | length' "$spec")
[[ "$dupe" -gt 0 ]] && { echo "Error: behaviour '$ID' already exists" >&2; exit 1; }

jq --arg id "$ID" --arg source "$SOURCE" --arg status "$STATUS" --arg detail "$DETAIL" \
    '.behaviours += [{id: $id, source: $source, status: $status, detail: $detail}]' \
    "$spec" > "$spec.tmp" && mv "$spec.tmp" "$spec"

echo "Added behaviour '$ID' ($STATUS)"
