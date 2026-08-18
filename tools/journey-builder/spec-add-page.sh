#!/bin/bash
# Append one page to a section in journey-spec.json (SPEC_RECONCILER helper).
# Creates the section on first use (section order = call order).
#
# Structured extras (gate, ...) come via repeated --json K='<json>';
# simple strings (provisionalCopy, notes, ...) via --field K=V.
#
# Usage:
#   spec-add-page.sh EUDPA-X --section origin --section-title "Where the animals come from" \
#       --id country-of-origin --slug origin/country --title "Country of origin" \
#       --collects countryOfOrigin,regionCodeRequirement,regionCode \
#       [--json gate='{"...":"..."}'] [--field provisionalCopy=true]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; SECTION=""; SECTION_TITLE=""; ID=""; SLUG=""; TITLE=""; COLLECTS=""
KEYS=(); VALS=(); IS_JSON=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --section) SECTION="$2"; shift 2 ;;
        --section-title) SECTION_TITLE="$2"; shift 2 ;;
        --id) ID="$2"; shift 2 ;;
        --slug) SLUG="$2"; shift 2 ;;
        --title) TITLE="$2"; shift 2 ;;
        --collects) COLLECTS="$2"; shift 2 ;;
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
for v in RUN_ID SECTION ID SLUG TITLE; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec="$(jq -r '.spec_dir' "$meta")/journey-spec.json"
[[ -f "$spec" ]] || { echo "Error: $spec not found" >&2; exit 1; }

collects_json=$(jq -n --arg c "$COLLECTS" '$c | if . == "" then [] else split(",") end')

page=$(jq -n --arg id "$ID" --arg slug "$SLUG" --arg title "$TITLE" --argjson collects "$collects_json" \
    '{id: $id, slug: $slug, title: $title, gate: null, collects: $collects}')
for i in "${!KEYS[@]}"; do
    if [[ "${IS_JSON[$i]}" == 1 ]]; then
        if ! echo "${VALS[$i]}" | jq -e . > /dev/null 2>&1; then
            echo "Error: --json ${KEYS[$i]} value is not valid JSON" >&2; exit 1
        fi
        page=$(jq -n --argjson cur "$page" --arg k "${KEYS[$i]}" --argjson v "${VALS[$i]}" '$cur + {($k): $v}')
    else
        page=$(jq -n --argjson cur "$page" --arg k "${KEYS[$i]}" --arg v "${VALS[$i]}" '$cur + {($k): $v}')
    fi
done

page_dupe=$(jq --arg id "$ID" '[.sections[].pages[] | select(.id == $id)] | length' "$spec")
[[ "$page_dupe" -gt 0 ]] && { echo "Error: page '$ID' already exists" >&2; exit 1; }

jq \
    --arg section "$SECTION" --arg stitle "${SECTION_TITLE:-$SECTION}" \
    --argjson page "$page" \
    '
    (if ([.sections[] | select(.id == $section)] | length) == 0
     then .sections += [{id: $section, title: $stitle, gate: null, pages: []}]
     else . end)
    | .sections |= map(
        if .id == $section
        then .pages += [$page]
        else . end)
    ' "$spec" > "$spec.tmp" && mv "$spec.tmp" "$spec"

echo "Added page '$ID' to section '$SECTION' (collects: ${COLLECTS:-none})"
