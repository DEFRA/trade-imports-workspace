#!/bin/bash
# Append one obligation to journey-spec.json (SPEC_RECONCILER helper).
# The spec lives in the frontend worktree; its path is resolved from
# .digest-meta.json — never pass a path by hand.
#
# Required: --id (path-safe: letters/digits, leading letter), --applies-at,
# --kind, at least one --json provenance='[{"source":...,"ref":...}]'.
# Structured facts (mandate, activatedBy, item, input, conflicts, notes,
# modelGap...) come via repeated --json K='<json>'; simple strings via
# --field K=V.
#
# Usage:
#   spec-add-field.sh EUDPA-X --id countryOfOrigin \
#       --applies-at notification --kind scalar \
#       --json mandate='{"required":true}' --field mandateRaw="Mandatory to submit" \
#       --json provenance='[{"source":"confluence-v4","ref":"#country_of_origin"}]'

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; ID=""; APPLIES_AT=""; KIND=""
KEYS=(); VALS=(); IS_JSON=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --id) ID="$2"; shift 2 ;;
        --applies-at) APPLIES_AT="$2"; shift 2 ;;
        --kind) KIND="$2"; shift 2 ;;
        --field|--json)
            key="${2%%=*}"; val="${2#*=}"
            [[ "$key" == "$2" ]] && { echo "Error: $1 expects KEY=VALUE, got '$2'" >&2; exit 1; }
            KEYS+=("$key"); VALS+=("$val")
            [[ "$1" == "--json" ]] && IS_JSON+=(1) || IS_JSON+=(0)
            shift 2
            ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in RUN_ID ID APPLIES_AT KIND; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done
[[ "$ID" =~ ^[a-zA-Z][a-zA-Z0-9]*$ ]] || { echo "Error: id '$ID' is not path-safe (^[a-zA-Z][a-zA-Z0-9]*$)" >&2; exit 1; }
case "$APPLIES_AT" in
    notification|commodity|unit) ;;
    *) echo "Error: --applies-at must be notification|commodity|unit" >&2; exit 1 ;;
esac
case "$KIND" in
    scalar|collection) ;;
    *) echo "Error: --kind must be scalar|collection" >&2; exit 1 ;;
esac

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec="$(jq -r '.spec_dir' "$meta")/journey-spec.json"
[[ -f "$spec" ]] || { echo "Error: $spec not found" >&2; exit 1; }

obligation=$(jq -n --arg id "$ID" --arg at "$APPLIES_AT" --arg kind "$KIND" \
    '{id: $id, appliesAt: $at, kind: $kind}')
has_provenance=false
for i in "${!KEYS[@]}"; do
    if [[ "${IS_JSON[$i]}" == 1 ]]; then
        if ! echo "${VALS[$i]}" | jq -e . > /dev/null 2>&1; then
            echo "Error: --json ${KEYS[$i]} value is not valid JSON" >&2; exit 1
        fi
        obligation=$(jq -n --argjson cur "$obligation" --arg k "${KEYS[$i]}" --argjson v "${VALS[$i]}" '$cur + {($k): $v}')
    else
        obligation=$(jq -n --argjson cur "$obligation" --arg k "${KEYS[$i]}" --arg v "${VALS[$i]}" '$cur + {($k): $v}')
    fi
    [[ "${KEYS[$i]}" == "provenance" ]] && has_provenance=true
done
[[ "$has_provenance" == false ]] && { echo "Error: --json provenance='[...]' is required" >&2; exit 1; }

dupe=$(jq --arg id "$ID" '[.obligations[] | select(.id == $id)] | length' "$spec")
[[ "$dupe" -gt 0 ]] && { echo "Error: obligation '$ID' already exists" >&2; exit 1; }

jq --argjson o "$obligation" '.obligations += [$o]' "$spec" > "$spec.tmp" && mv "$spec.tmp" "$spec"
echo "Added obligation '$ID' ($APPLIES_AT, $KIND)"
