#!/bin/bash
# Define a reusable field group (e.g. the V4 Address Block) in journey-spec.json.
# Members are obligation-id fragments; usages reference the group by id.
#
# Usage:
#   spec-add-fieldgroup.sh EUDPA-X --id address \
#       --fields nameOrOrganisation,addressLine1,addressLine2,town,county,postcode \
#       [--detail "..."]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; ID=""; FIELDS=""; DETAIL=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --id) ID="$2"; shift 2 ;;
        --fields) FIELDS="$2"; shift 2 ;;
        --detail) DETAIL="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID ID FIELDS; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec="$(jq -r '.spec_dir' "$meta")/journey-spec.json"

exists=$(jq --arg id "$ID" '.fieldGroups | has($id)' "$spec")
[[ "$exists" == "true" ]] && { echo "Error: fieldGroup '$ID' already exists" >&2; exit 1; }

jq --arg id "$ID" --arg fields "$FIELDS" --arg detail "$DETAIL" \
    '.fieldGroups[$id] = {fields: ($fields | split(",")), detail: (if $detail == "" then null else $detail end)}' \
    "$spec" > "$spec.tmp" && mv "$spec.tmp" "$spec"

echo "Added fieldGroup '$ID' ($(echo "$FIELDS" | tr ',' '\n' | wc -l | tr -d ' ') fields)"
