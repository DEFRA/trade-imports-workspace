#!/bin/bash
# Update a behaviour's status, appending a ruling note (gate-session helper).
#
# Usage:
#   spec-set-behaviour-status.sh EUDPA-X --id back-navigation-variants \
#       --status adopted --note "Ruling: ..."

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; ID=""; STATUS=""; NOTE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --id) ID="$2"; shift 2 ;;
        --status) STATUS="$2"; shift 2 ;;
        --note) NOTE="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID ID STATUS NOTE; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done
case "$STATUS" in
    adopted|open-question) ;;
    *) echo "Error: --status must be adopted|open-question" >&2; exit 1 ;;
esac

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec="$(jq -r '.spec_dir' "$meta")/journey-spec.json"

exists=$(jq --arg id "$ID" '[.behaviours[] | select(.id == $id)] | length' "$spec")
[[ "$exists" -eq 0 ]] && { echo "Error: behaviour '$ID' not found" >&2; exit 1; }

jq --arg id "$ID" --arg status "$STATUS" --arg note "$NOTE" \
    '.behaviours |= map(if .id == $id then .status = $status | .detail = (.detail + " | " + $note) else . end)' \
    "$spec" > "$spec.tmp" && mv "$spec.tmp" "$spec"

echo "Behaviour '$ID' -> $STATUS"
