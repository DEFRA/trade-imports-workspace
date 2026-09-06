#!/bin/bash
# Remove an obligation from journey-spec.json together with every reference
# to it (gate-session helper): the page that collects it, the collection
# whose item[] lists it, the fieldGroup whose fields[] names it. The
# obligation and its references go in one jq pass, so a failure leaves
# nothing half-done and spec-lint.sh cannot find a dangling reference after.
#
# A gate is not a reference that can be cleaned: another obligation whose
# activatedBy.obligation names this one would be left gated on a fact nobody
# collects. The script refuses in that case; --force removes anyway and lists
# what it left dangling, for the caller to re-gate or remove next.
# --reason is echoed in the summary so the session transcript carries it.
#
# Usage:
#   spec-remove-field.sh EUDPA-X --id regionCode [--reason "..."] [--force]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; ID=""; REASON=""; FORCE=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --id) ID="$2"; shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        --force) FORCE=true; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID ID; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec="$(jq -r '.spec_dir' "$meta")/journey-spec.json"
[[ -f "$spec" ]] || { echo "Error: $spec not found" >&2; exit 1; }

exists=$(jq --arg id "$ID" '[.obligations[] | select(.id == $id)] | length' "$spec")
[[ "$exists" -eq 0 ]] && { echo "Error: obligation '$ID' not found" >&2; exit 1; }

dependants=$(jq -r --arg id "$ID" '[.obligations[] | select(.activatedBy.obligation == $id) | .id] | join(", ")' "$spec")
if [[ -n "$dependants" && "$FORCE" != true ]]; then
    echo "Error: obligation '$ID' gates $dependants (activatedBy) — re-gate or remove them first, or pass --force to leave them dangling" >&2
    exit 1
fi

references=$(jq -r --arg id "$ID" '
    ( .sections[].pages[] | select((.collects // []) | index($id)) | "page \(.id).collects" ),
    ( .obligations[] | select(.kind == "collection" and ((.item // []) | index($id))) | "collection \(.id).item" ),
    ( (.fieldGroups // {}) | to_entries[] | select((.value.fields // []) | index($id)) | "fieldGroup \(.key).fields" )' "$spec")

# Each call writes through its own temp file: concurrent callers sharing one
# temp name rename over each other and drop items. Same directory keeps the
# mv an atomic rename; the trap clears the temp if jq fails.
tmp="$(mktemp "$spec.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
jq --arg id "$ID" \
    '
    .obligations |= map(select(.id != $id))
    | .obligations |= map(if .item then .item |= map(select(. != $id)) else . end)
    | .sections |= map(.pages |= map(if .collects then .collects |= map(select(. != $id)) else . end))
    | if .fieldGroups then .fieldGroups |= with_entries(if .value.fields then .value.fields |= map(select(. != $id)) else . end) else . end
    ' "$spec" > "$tmp"
mv "$tmp" "$spec"

echo "Removed obligation '$ID'${REASON:+ — $REASON}"
[[ -n "$references" ]] && while read -r r; do echo "  cleaned $r"; done <<<"$references"
[[ -n "$dependants" ]] && echo "  left dangling (--force): activatedBy.obligation on $dependants"
exit 0
