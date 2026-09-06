#!/bin/bash
# Update an existing page in journey-spec.json in place (gate-session
# helper). A ruling that renames a page, changes its gate or moves an
# obligation between pages is applied here rather than by hand-editing the
# JSON, so the edit is scriptable and survives a re-run of the same ruling.
#
# The page must already exist in some section (spec-add-page.sh creates);
# `id` may not be changed, because backlog increments and extras anchor on
# it. Simple strings via --field K=V; structured extras via --json K='<json>'
# (validated, so `false` and `null` are accepted); --unset K removes a key;
# --collects a,b,c replaces the whole collects list (`--collects ''` empties
# it).
#
# Usage:
#   spec-set-page.sh EUDPA-X --id country-of-origin \
#       [--field title="Where the animals come from"] [--json gate=null] \
#       [--unset provisionalCopy] [--collects countryOfOrigin,regionCode]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; ID=""; COLLECTS=""; COLLECTS_GIVEN=false
KEYS=(); VALS=(); IS_JSON=(); UNSET=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --id) ID="$2"; shift 2 ;;
        --collects) COLLECTS="$2"; COLLECTS_GIVEN=true; shift 2 ;;
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
[[ ${#KEYS[@]} -eq 0 && ${#UNSET[@]} -eq 0 && "$COLLECTS_GIVEN" == false ]] && { echo "Error: nothing to change — pass --field, --json, --unset or --collects" >&2; exit 1; }
for k in "${KEYS[@]}" "${UNSET[@]}"; do
    [[ "$k" == "id" ]] && { echo "Error: id may not be changed — backlog increments anchor on it" >&2; exit 1; }
    [[ "$k" == "collects" ]] && { echo "Error: use --collects a,b,c to replace the collects list" >&2; exit 1; }
done

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec="$(jq -r '.spec_dir' "$meta")/journey-spec.json"
[[ -f "$spec" ]] || { echo "Error: $spec not found" >&2; exit 1; }

exists=$(jq --arg id "$ID" '[.sections[].pages[] | select(.id == $id)] | length' "$spec")
[[ "$exists" -eq 0 ]] && { echo "Error: page '$ID' not found" >&2; exit 1; }

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
if [[ "$COLLECTS_GIVEN" == true ]]; then
    collects_json=$(jq -n --arg c "$COLLECTS" '$c | if . == "" then [] else split(",") end')
    patch=$(jq -n --argjson cur "$patch" --argjson v "$collects_json" '$cur + {collects: $v}')
fi
unset_json=$(printf '%s\n' "${UNSET[@]}" | jq -R . | jq -s 'map(select(. != ""))')

# Each call writes through its own temp file: concurrent callers sharing one
# temp name rename over each other and drop items. Same directory keeps the
# mv an atomic rename; the trap clears the temp if jq fails.
tmp="$(mktemp "$spec.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
jq --arg id "$ID" --argjson patch "$patch" --argjson unset "$unset_json" \
    '.sections |= map(.pages |= map(
        if .id == $id
        then (. + $patch) | reduce $unset[] as $k (.; del(.[$k]))
        else . end))' \
    "$spec" > "$tmp"
mv "$tmp" "$spec"

echo "Updated page '$ID' (set: $(jq -r 'keys | join(",")' <<<"$patch"); unset: $(jq -r 'join(",")' <<<"$unset_json"))"
