#!/bin/bash
# Update an existing obligation in journey-spec.json in place (gate-session
# helper). A ruling that changes a mandate, a note or a modelGap is applied
# here rather than by hand-editing the JSON, so the edit is scriptable and
# survives a re-run of the same ruling.
#
# The obligation must already exist (spec-add-field.sh creates); `id` may not
# be changed, because pages, collections and conflicts reference it. Simple
# strings via --field K=V; structured facts via --json K='<json>' (validated,
# so `false` and `null` are accepted); --unset K removes a key.
#
# Usage:
#   spec-set-field.sh EUDPA-X --id countryOfOrigin \
#       [--field mandateRaw="Optional"] [--json mandate='{"required":false}'] \
#       [--unset modelGap]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; ID=""
KEYS=(); VALS=(); IS_JSON=(); UNSET=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --id) ID="$2"; shift 2 ;;
        --field|--json)
            key="${2%%=*}"; val="${2#*=}"
            [[ "$key" == "$2" ]] && { echo "Error: $1 expects KEY=VALUE, got '$2'" >&2; exit 1; }
            KEYS+=("$key"); VALS+=("$val")
            [[ "$1" == "--json" ]] && IS_JSON+=(1) || IS_JSON+=(0)
            shift 2
            ;;
        --unset) UNSET+=("$2"); shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in RUN_ID ID; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done
[[ ${#KEYS[@]} -eq 0 && ${#UNSET[@]} -eq 0 ]] && { echo "Error: nothing to change — pass --field, --json or --unset" >&2; exit 1; }
for k in "${KEYS[@]}" "${UNSET[@]}"; do
    [[ "$k" == "id" ]] && { echo "Error: id may not be changed — other spec entries reference it" >&2; exit 1; }
done

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec="$(jq -r '.spec_dir' "$meta")/journey-spec.json"
[[ -f "$spec" ]] || { echo "Error: $spec not found" >&2; exit 1; }

exists=$(jq --arg id "$ID" '[.obligations[] | select(.id == $id)] | length' "$spec")
[[ "$exists" -eq 0 ]] && { echo "Error: obligation '$ID' not found" >&2; exit 1; }

patch='{}'
for i in "${!KEYS[@]}"; do
    if [[ "${IS_JSON[$i]}" == 1 ]]; then
        if ! echo "${VALS[$i]}" | jq . > /dev/null 2>&1; then
            echo "Error: --json ${KEYS[$i]} value is not valid JSON" >&2; exit 1
        fi
        patch=$(jq -n --argjson cur "$patch" --arg k "${KEYS[$i]}" --argjson v "${VALS[$i]}" '$cur + {($k): $v}')
    else
        patch=$(jq -n --argjson cur "$patch" --arg k "${KEYS[$i]}" --arg v "${VALS[$i]}" '$cur + {($k): $v}')
    fi
done
unset_json=$(printf '%s\n' "${UNSET[@]}" | jq -R . | jq -s 'map(select(. != ""))')

# Each call writes through its own temp file: concurrent callers sharing one
# temp name rename over each other and drop items. Same directory keeps the
# mv an atomic rename; the trap clears the temp if jq fails.
tmp="$(mktemp "$spec.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
jq --arg id "$ID" --argjson patch "$patch" --argjson unset "$unset_json" \
    '.obligations |= map(
        if .id == $id
        then (. + $patch) | reduce $unset[] as $k (.; del(.[$k]))
        else . end)' \
    "$spec" > "$tmp"
mv "$tmp" "$spec"

echo "Updated obligation '$ID' (set: $(jq -r 'keys | join(",")' <<<"$patch"); unset: $(jq -r 'join(",")' <<<"$unset_json"))"
