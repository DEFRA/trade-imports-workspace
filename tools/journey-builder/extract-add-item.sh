#!/bin/bash
# Append one item to an extract.<source>.json (SOURCE_EXTRACTOR helper).
# Workers never free-hand JSON — every extract mutation goes through here.
#
# Kinds and their required flags:
#   field      --id X --provenance REF   (+ any --field / --json)
#   page       --id X --provenance REF   (+ any --field / --json)
#   behaviour  --id X                    (+ any --field / --json)
#   note       --field text=...
#
# --field K=V adds a string value; --json K='<json>' adds a structured value
# (validated). Duplicate ids within a kind are rejected.
#
# Usage:
#   extract-add-item.sh EUDPA-X --source confluence-v4 --kind field \
#       --id countryOfOrigin --provenance "#country_of_origin" \
#       --field label="Country of origin" --json mandate='{"required":true}'

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; SOURCE=""; KIND=""; ID=""; PROVENANCE=""
KEYS=(); VALS=(); IS_JSON=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --source) SOURCE="$2"; shift 2 ;;
        --kind) KIND="$2"; shift 2 ;;
        --id) ID="$2"; shift 2 ;;
        --provenance) PROVENANCE="$2"; shift 2 ;;
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

for v in RUN_ID SOURCE KIND; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

case "$KIND" in
    field|page|behaviour) section="${KIND}s"
        [[ -z "$ID" ]] && { echo "Error: --id required for kind $KIND" >&2; exit 1; } ;;
    note) section="notes" ;;
    *) echo "Error: invalid --kind '$KIND' (field|page|behaviour|note)" >&2; exit 1 ;;
esac
if [[ "$KIND" == "field" || "$KIND" == "page" ]]; then
    [[ -z "$PROVENANCE" ]] && { echo "Error: --provenance required for kind $KIND" >&2; exit 1; }
fi

target="$WORKSPACE/workareas/journey-builder/$RUN_ID/extract.$SOURCE.json"
[[ -f "$target" ]] || { echo "Error: $target not found — run prepare-digest.sh first" >&2; exit 1; }

item="{}"
[[ -n "$ID" ]] && item=$(jq -n --arg id "$ID" '{id: $id}')
for i in "${!KEYS[@]}"; do
    if [[ "${IS_JSON[$i]}" == 1 ]]; then
        if ! echo "${VALS[$i]}" | jq -e . > /dev/null 2>&1; then
            echo "Error: --json ${KEYS[$i]} value is not valid JSON" >&2; exit 1
        fi
        item=$(jq -n --argjson cur "$item" --arg k "${KEYS[$i]}" --argjson v "${VALS[$i]}" '$cur + {($k): $v}')
    else
        item=$(jq -n --argjson cur "$item" --arg k "${KEYS[$i]}" --arg v "${VALS[$i]}" '$cur + {($k): $v}')
    fi
done
[[ -n "$PROVENANCE" ]] && item=$(jq -n --argjson cur "$item" --arg p "$PROVENANCE" '$cur + {provenance: $p}')

if [[ -n "$ID" ]]; then
    dupe=$(jq --arg s "$section" --arg id "$ID" '[.[$s][] | select(.id == $id)] | length' "$target")
    [[ "$dupe" -gt 0 ]] && { echo "Error: $KIND '$ID' already exists in $SOURCE extract" >&2; exit 1; }
fi

jq --arg s "$section" --argjson item "$item" '.[$s] += [$item]' "$target" > "$target.tmp" \
    && mv "$target.tmp" "$target"

echo "Added $KIND${ID:+ '$ID'} to extract.$SOURCE.json"
