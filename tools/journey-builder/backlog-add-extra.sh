#!/bin/bash
# Append a declared extra to <spec_dir>/backlog-extras.json (creating the
# file) and print its key. Extras are the increments a run needs that no
# spec page can yield — repo hygiene, restored tests, E2E coverage in
# another repo. backlog-generate.sh splices them in at their anchors on
# every regeneration, so they never have to be hand-edited into
# backlog.json, where they would block regeneration.
#
# --type is one of fix, e2e, chore, restore — kept deliberately small so
# the build loop's dispatch stays predictable; widen it here and in
# backlog-generate.sh together.
# --anchor is one of: start | end | before=page:<pageId> | after=page:<pageId>
#   | before=key:<extraKey> | after=key:<extraKey>. A key anchor must name
#   an extra earlier in the file: the generator resolves in file order.
# --repo is workspace-relative and defaults to the target repo.
# --milestone defaults to that of the anchored increment (M1 at start/end).
# --gate sam makes the extra born blocked, like a model-extension.
#
# Usage:
#   backlog-add-extra.sh EUDPA-X --key lighthouse-scripts --type fix \
#       --title "Restore the lighthouse audit scripts" --detail "..." \
#       --anchor 'before=page:origin' \
#       [--repo repos/trade-imports-plants-frontend] [--milestone M1] [--gate sam]

set -e

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

RUN_ID=""; KEY=""; TYPE=""; TITLE=""; DETAIL=""; ANCHOR=""; REPO=""; MILESTONE=""; GATE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) RUN_ID="$1"; shift ;;
        --key) KEY="$2"; shift 2 ;;
        --type) TYPE="$2"; shift 2 ;;
        --title) TITLE="$2"; shift 2 ;;
        --detail) DETAIL="$2"; shift 2 ;;
        --anchor) ANCHOR="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --milestone) MILESTONE="$2"; shift 2 ;;
        --gate) GATE="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done
for v in RUN_ID KEY TYPE TITLE DETAIL ANCHOR; do
    [[ -z "${!v}" ]] && { echo "Error: missing $v" >&2; exit 1; }
done

# The key is half of the increment's content key (fix:<key>), which is how
# statuses survive regeneration — so it has to be a stable slug.
[[ "$KEY" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Error: --key '$KEY' must be a slug (a-z, 0-9, hyphens)" >&2; exit 1; }
case "$TYPE" in
    fix|e2e|chore|restore) ;;
    *) echo "Error: --type '$TYPE' must be one of fix, e2e, chore, restore" >&2; exit 1 ;;
esac
[[ "$ANCHOR" =~ ^(start|end|(before|after)=(page|key):[^[:space:]]+)$ ]] || {
    echo "Error: --anchor '$ANCHOR' must be start, end, before=page:<pageId>, after=page:<pageId>, before=key:<extraKey> or after=key:<extraKey>" >&2
    exit 1
}
[[ -z "$MILESTONE" || "$MILESTONE" =~ ^M[0-9]+$ ]] || { echo "Error: --milestone '$MILESTONE' must look like M1" >&2; exit 1; }
[[ -z "$GATE" || "$GATE" == "sam" ]] || { echo "Error: --gate '$GATE' must be sam" >&2; exit 1; }
[[ -z "$REPO" || -d "$WORKSPACE/$REPO" ]] || { echo "Error: --repo '$REPO' is not a directory under the workspace" >&2; exit 1; }

meta="$WORKSPACE/workareas/journey-builder/$RUN_ID/.digest-meta.json"
[[ -f "$meta" ]] || { echo "Error: $meta not found — run prepare-digest.sh first" >&2; exit 1; }
spec_dir="$(jq -r '.spec_dir // empty' "$meta")"
[[ -n "$spec_dir" && -d "$spec_dir" ]] || { echo "Error: $meta has no usable spec_dir — extras live beside journey-spec.json" >&2; exit 1; }
target="$spec_dir/backlog-extras.json"
[[ -f "$target" ]] || echo '{"schema_version":1,"increments":[]}' > "$target"

dup=$(jq --arg key "$KEY" '[.increments[] | select(.key == $key)] | length' "$target")
[[ "$dup" -eq 0 ]] || { echo "Error: extra '$KEY' already declared in $target" >&2; exit 1; }

case "$ANCHOR" in
    start) anchor_json='{"start":true}' ;;
    end) anchor_json='{"end":true}' ;;
    *) anchor_json=$(jq -cn --arg side "${ANCHOR%%=*}" --arg ref "${ANCHOR#*=}" '{($side): $ref}') ;;
esac

# Each call writes through its own temp file: concurrent callers sharing one
# temp name rename over each other and drop items. Same directory keeps the
# mv an atomic rename; the trap clears the temp if jq fails.
tmp="$(mktemp "$target.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
jq \
    --arg key "$KEY" --arg type "$TYPE" --arg title "$TITLE" --arg detail "$DETAIL" \
    --arg repo "$REPO" --arg milestone "$MILESTONE" --arg gate "$GATE" --argjson anchor "$anchor_json" \
    '.increments += [{
        key: $key,
        type: $type,
        repo: (if $repo == "" then null else $repo end),
        title: $title,
        detail: $detail,
        milestone: (if $milestone == "" then null else $milestone end),
        gate: (if $gate == "" then null else $gate end),
        anchor: $anchor
    }]' "$target" > "$tmp"
mv "$tmp" "$target"

echo "$KEY"
