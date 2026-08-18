#!/bin/bash
# Append a conflict to conflicts.json and print its id (c-NNN).
# Conflicts are recorded, never blocking; resolution stays null until a
# gate session resolves it.
#
# Usage:
#   spec-add-conflict.sh EUDPA-X --fields countryOfOrigin \
#       --sources confluence-v4,skeleton --detail "..."

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; FIELDS=""; SOURCES=""; DETAIL=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --fields) FIELDS="$2"; shift 2 ;;
        --sources) SOURCES="$2"; shift 2 ;;
        --detail) DETAIL="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID SOURCES DETAIL; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
target="$(jq -r '.spec_dir' "$meta")/conflicts.json"
[[ -f "$target" ]] || { echo "Error: $target not found" >&2; exit 1; }

next=$(jq '(.conflicts | map(.id | ltrimstr("c-") | tonumber) | max // 0) + 1' "$target")
new_id=$(printf "c-%03d" "$next")

jq \
    --arg id "$new_id" --arg fields "$FIELDS" --arg sources "$SOURCES" --arg detail "$DETAIL" \
    '.conflicts += [{
        id: $id,
        fields: ($fields | if . == "" then [] else split(",") end),
        sources: ($sources | split(",")),
        detail: $detail,
        resolution: null,
        resolvedBy: null
    }]' "$target" > "$target.tmp" && mv "$target.tmp" "$target"

echo "$new_id"
