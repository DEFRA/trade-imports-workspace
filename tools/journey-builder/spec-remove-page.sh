#!/bin/bash
# Remove a page from journey-spec.json (gate-session helper). A section
# exists to hold pages, so when the removal empties one the section goes too
# — an empty section would yield no increment and mislead the hub.
#
# A page whose collects is non-empty is refused: its obligations would be
# collected by nothing, and spec-lint.sh's coverage rule fails on that. The
# caller re-homes them (spec-set-page.sh --collects) or removes them
# (spec-remove-field.sh) first. --force removes the page anyway and lists
# the obligations left uncovered. --reason is echoed in the summary so the
# session transcript carries it.
#
# Usage:
#   spec-remove-page.sh EUDPA-X --id region-code [--reason "..."] [--force]

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

section=$(jq -r --arg id "$ID" 'first(.sections[] | select(any(.pages[]; .id == $id)) | .id) // empty' "$spec")
[[ -n "$section" ]] || { echo "Error: page '$ID' not found" >&2; exit 1; }

collects=$(jq -r --arg id "$ID" 'first(.sections[].pages[] | select(.id == $id) | (.collects // [])) | join(", ")' "$spec")
if [[ -n "$collects" && "$FORCE" != true ]]; then
    echo "Error: page '$ID' collects $collects — re-home them (spec-set-page.sh --collects) or remove them (spec-remove-field.sh) first, or pass --force to leave them uncovered" >&2
    exit 1
fi

# The section is dropped only when this removal empties it: a section that
# was already empty is somebody else's decision.
remaining=$(jq --arg id "$ID" --arg section "$section" \
    'first(.sections[] | select(.id == $section) | [.pages[] | select(.id != $id)] | length)' "$spec")

# Each call writes through its own temp file: concurrent callers sharing one
# temp name rename over each other and drop items. Same directory keeps the
# mv an atomic rename; the trap clears the temp if jq fails.
tmp="$(mktemp "$spec.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
jq --arg id "$ID" --arg section "$section" \
    '
    .sections |= map(if .id == $section then .pages |= map(select(.id != $id)) else . end)
    | .sections |= map(select(.id != $section or (.pages | length) > 0))
    ' "$spec" > "$tmp"
mv "$tmp" "$spec"

echo "Removed page '$ID' from section '$section'${REASON:+ — $REASON}"
[[ "$remaining" -eq 0 ]] && echo "  section '$section' became empty — removed it too"
[[ -n "$collects" ]] && echo "  left uncovered (--force): $collects — spec-lint.sh fails until they are re-homed or removed"
exit 0
