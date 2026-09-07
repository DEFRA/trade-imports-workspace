#!/bin/bash
# Remove a declared extra from <spec_dir>/backlog-extras.json. The generator
# resolves key anchors in file order, so an extra another extra anchors on
# (before=key:<extraKey> / after=key:<extraKey>) cannot go while the
# dependant stands — the next regeneration would fail on the dangling
# anchor. The script refuses and lists the dependants; re-anchor them
# (backlog-set-extra.sh --anchor) or remove them first.
#
# The increment derived from the extra leaves backlog.json on the next
# backlog-generate.sh, which reports it as one it cannot re-derive; pass
# --force there once the status it carried is not wanted.
#
# Usage:
#   backlog-remove-extra.sh EUDPA-X --key lighthouse-scripts

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; KEY=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --key) KEY="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID KEY; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec_dir="$(jq -r '.spec_dir // empty' "$meta")"
[[ -n "$spec_dir" && -d "$spec_dir" ]] || { echo "Error: $meta has no usable spec_dir — extras live beside journey-spec.json" >&2; exit 1; }
target="$spec_dir/backlog-extras.json"
[[ -f "$target" ]] || { echo "Error: $target not found — backlog-add-extra.sh creates it" >&2; exit 1; }

exists=$(jq --arg key "$KEY" '[.increments[] | select(.key == $key)] | length' "$target")
[[ "$exists" -eq 0 ]] && { echo "Error: extra '$KEY' not found in $target" >&2; exit 1; }

dependants=$(jq -r --arg ref "key:$KEY" \
    '[.increments[] | select((.anchor.before // .anchor.after) == $ref) | .key] | join(", ")' "$target")
if [[ -n "$dependants" ]]; then
    echo "Error: extra '$KEY' is the anchor of $dependants — re-anchor them (backlog-set-extra.sh --anchor) or remove them first" >&2
    exit 1
fi

# Each call writes through its own temp file: concurrent callers sharing one
# temp name rename over each other and drop items. Same directory keeps the
# mv an atomic rename; the trap clears the temp if jq fails.
tmp="$(mktemp "$target.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
jq --arg key "$KEY" '.increments |= map(select(.key != $key))' "$target" > "$tmp"
mv "$tmp" "$target"

echo "Removed extra '$KEY'"
