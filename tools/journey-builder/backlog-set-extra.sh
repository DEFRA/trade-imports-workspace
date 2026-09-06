#!/bin/bash
# Update an existing extra in <spec_dir>/backlog-extras.json in place. A
# ruling that re-anchors an extra, retitles it or gates it is applied here
# rather than by hand-editing the JSON, so the edit is scriptable and
# survives a re-run of the same ruling.
#
# The extra must already exist (backlog-add-extra.sh creates); `key` may not
# be changed, because other extras anchor on it and the generator preserves
# status under <type>:<key>. --anchor takes the same forms as
# backlog-add-extra.sh (start | end | before=page:<pageId> |
# after=page:<pageId> | before=key:<extraKey> | after=key:<extraKey>) and
# may not name the extra itself. Simple strings via --field K=V; structured
# facts via --json K='<json>' (validated, so `null` is accepted); --unset K
# removes a key. The merged extra is checked against the same rules
# backlog-add-extra.sh applies on creation — type vocabulary, milestone
# shape, gate value, repo directory — so a bad edit is refused before the
# generator trips over it.
#
# Usage:
#   backlog-set-extra.sh EUDPA-X --key lighthouse-scripts \
#       [--anchor 'after=page:origin'] [--field title="..."] \
#       [--json gate=null] [--unset milestone]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; KEY=""; ANCHOR=""
KEYS=(); VALS=(); IS_JSON=(); UNSET=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --key) KEY="$2"; shift 2 ;;
        --anchor) ANCHOR="$2"; shift 2 ;;
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
for v in RUN_ID KEY; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done
[[ ${#KEYS[@]} -eq 0 && ${#UNSET[@]} -eq 0 && -z "$ANCHOR" ]] && { echo "Error: nothing to change — pass --field, --json, --unset or --anchor" >&2; exit 1; }
for k in "${KEYS[@]}" "${UNSET[@]}"; do
    [[ "$k" == "key" ]] && { echo "Error: key may not be changed — other extras anchor on it and statuses are kept under it" >&2; exit 1; }
    [[ "$k" == "anchor" ]] && { echo "Error: use --anchor to change the anchor" >&2; exit 1; }
done
for k in "${UNSET[@]}"; do
    case "$k" in
        type|title) echo "Error: $k is required — set it with --field, do not unset it" >&2; exit 1 ;;
    esac
done
[[ -z "$ANCHOR" || "$ANCHOR" =~ ^(start|end|(before|after)=(page|key):[^[:space:]]+)$ ]] || {
    echo "Error: --anchor '$ANCHOR' must be start, end, before=page:<pageId>, after=page:<pageId>, before=key:<extraKey> or after=key:<extraKey>" >&2
    exit 1
}
[[ "${ANCHOR#*=}" != "key:$KEY" ]] || { echo "Error: --anchor '$ANCHOR' names the extra itself" >&2; exit 1; }

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec_dir="$(jq -r '.spec_dir // empty' "$meta")"
[[ -n "$spec_dir" && -d "$spec_dir" ]] || { echo "Error: $meta has no usable spec_dir — extras live beside journey-spec.json" >&2; exit 1; }
target="$spec_dir/backlog-extras.json"
[[ -f "$target" ]] || { echo "Error: $target not found — backlog-add-extra.sh creates it" >&2; exit 1; }

exists=$(jq --arg key "$KEY" '[.increments[] | select(.key == $key)] | length' "$target")
[[ "$exists" -eq 0 ]] && { echo "Error: extra '$KEY' not found in $target" >&2; exit 1; }

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
if [[ -n "$ANCHOR" ]]; then
    case "$ANCHOR" in
        start) anchor_json='{"start":true}' ;;
        end) anchor_json='{"end":true}' ;;
        *) anchor_json=$(jq -cn --arg side "${ANCHOR%%=*}" --arg ref "${ANCHOR#*=}" '{($side): $ref}') ;;
    esac
    patch=$(jq -n --argjson cur "$patch" --argjson v "$anchor_json" '$cur + {anchor: $v}')
fi
unset_json=$(printf '%s\n' "${UNSET[@]}" | jq -R . | jq -s 'map(select(. != ""))')

# The rules backlog-add-extra.sh applies to its flags are applied to the
# merged extra, so --field and --json edits are held to the same vocabulary.
merged=$(jq -c --arg key "$KEY" --argjson patch "$patch" --argjson unset "$unset_json" \
    'first(.increments[] | select(.key == $key)) | (. + $patch) | reduce $unset[] as $k (.; del(.[$k]))' "$target")
type=$(jq -r '.type' <<<"$merged")
case "$type" in
    fix|e2e|chore|restore) ;;
    *) echo "Error: type '$type' must be one of fix, e2e, chore, restore" >&2; exit 1 ;;
esac
title=$(jq -r '.title // ""' <<<"$merged")
[[ -n "$title" ]] || { echo "Error: title is required" >&2; exit 1; }
milestone=$(jq -r '.milestone // ""' <<<"$merged")
[[ -z "$milestone" || "$milestone" =~ ^M[0-9]+$ ]] || { echo "Error: milestone '$milestone' must look like M1" >&2; exit 1; }
gate=$(jq -r '.gate // ""' <<<"$merged")
[[ -z "$gate" || "$gate" == "sam" ]] || { echo "Error: gate '$gate' must be sam" >&2; exit 1; }
repo=$(jq -r '.repo // ""' <<<"$merged")
[[ -z "$repo" || -d "$WORKSPACE/$repo" ]] || { echo "Error: repo '$repo' is not a directory under the workspace" >&2; exit 1; }

# Each call writes through its own temp file: concurrent callers sharing one
# temp name rename over each other and drop items. Same directory keeps the
# mv an atomic rename; the trap clears the temp if jq fails.
tmp="$(mktemp "$target.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
jq --arg key "$KEY" --argjson patch "$patch" --argjson unset "$unset_json" \
    '.increments |= map(
        if .key == $key
        then (. + $patch) | reduce $unset[] as $k (.; del(.[$k]))
        else . end)' \
    "$target" > "$tmp"
mv "$tmp" "$target"

echo "Updated extra '$KEY' (set: $(jq -r 'keys | join(",")' <<<"$patch"); unset: $(jq -r 'join(",")' <<<"$unset_json"))"
