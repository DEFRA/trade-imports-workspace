#!/bin/bash
# Search every repo in a review for old names and wording the change may
# have left behind, in one call. The consistency reviewer's step 3b.
#
# Usage:
#   stale-search.sh ID TERM [TERM ...] [--max-hits N] [--docs-root DIR]
#
# ID is the ticket (EUDPA-X) or the local id (local/<repo>/<branch>).
# Each TERM is a fixed string, not a pattern: an old class name, literal,
# route or phrase.
#
# Searches every tracked file in each repo's checkout at the reviewed
# commit (the pinned clone under the workarea's repos/, or repos/<repo>
# in local mode), skipping lockfiles. When the review does not include the
# workspace repo, also searches the workspace's docs/best-practices/,
# openspec/specs/ and CLAUDE.md, from --docs-root (default: the workspace
# checkout).
#
# Prints, for each term, every hit as "repo path:line [changed] text",
# where [changed] marks a file this review changed (its hits may be on the
# changed lines themselves). At most --max-hits hits per term (default 40),
# then a count of the rest. Ends with the places searched, so a report can
# name them truthfully.

set -euo pipefail

WORKSPACE="$HOME/git/defra/trade-imports-workspace"

ID=""
MAX_HITS=40
DOCS_ROOT="$WORKSPACE"
TERMS=()

usage() {
    sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
    exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --max-hits) MAX_HITS="$2"; shift 2 ;;
        --docs-root) DOCS_ROOT="$2"; shift 2 ;;
        -h|--help) usage 0 ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *)
            if [[ -z "$ID" ]]; then ID="$1"; else TERMS+=("$1"); fi
            shift
            ;;
    esac
done

[[ -n "$ID" ]] || { echo "Missing ID" >&2; usage; }
[[ ${#TERMS[@]} -gt 0 ]] || { echo "Missing TERM: give at least one" >&2; usage; }
[[ "$MAX_HITS" =~ ^[1-9][0-9]*$ ]] || { echo "--max-hits must be a whole number above 0" >&2; exit 1; }

REVIEW_DIR="$WORKSPACE/workareas/reviews/$ID"
META="$REVIEW_DIR/.review-meta.json"
[[ -f "$META" ]] || { echo "No .review-meta.json in $REVIEW_DIR" >&2; exit 1; }

is_local=$(jq -r '.local // false' "$META")
local_branch=$(jq -r '.branch // empty' "$META")

repo_dir() {
    if [[ "$is_local" == "true" ]]; then
        echo "$WORKSPACE/repos/$1"
    else
        echo "$REVIEW_DIR/repos/$1"
    fi
}

# The tree to search: the working tree, or the branch when local mode
# reviews a branch that is not checked out.
tree_of() {
    if [[ "$is_local" == "true" && "$(git -C "$1" rev-parse --abbrev-ref HEAD)" != "$local_branch" ]]; then
        echo "$local_branch"
    fi
}

is_changed() {
    [[ -f "$REVIEW_DIR/file-reviews/$1/${2//\//_}.review.json" ]]
}

# Prints "path:line:text" for every hit of one term in one checkout.
hits_in() {
    local root="$1" term="$2" tree="$3"
    shift 3
    local -a args=(grep -n -I -F -e "$term")
    [[ -n "$tree" ]] && args+=("$tree")
    args+=(-- "$@" ':!*package-lock.json' ':!*yarn.lock' ':!*pnpm-lock.yaml')
    git -C "$root" "${args[@]}" 2> /dev/null | sed "s|^$tree:||" || true
}

repos=()
while IFS= read -r repo; do
    repos+=("$repo")
done < <(jq -r '[.prs[].repo] | unique | .[]' "$META")

searched=()
for repo in "${repos[@]}"; do
    root=$(repo_dir "$repo")
    [[ -d "$root/.git" || -f "$root/.git" ]] || { echo "No checkout for $repo at $root" >&2; exit 1; }
    searched+=("$repo: every tracked file but lockfiles")
done

include_docs=true
for repo in "${repos[@]}"; do
    [[ "$repo" == "trade-imports-workspace" ]] && include_docs=false
done
docs_paths=(docs/best-practices openspec/specs CLAUDE.md)
if [[ "$include_docs" == "true" ]]; then
    searched+=("workspace at $DOCS_ROOT: ${docs_paths[*]}")
fi

hits_file=$(mktemp)
trap 'rm -f "$hits_file"' EXIT

for term in "${TERMS[@]}"; do
    echo "## \`$term\`"
    echo
    {
        for repo in "${repos[@]}"; do
            root=$(repo_dir "$repo")
            while IFS= read -r hit; do
                [[ -n "$hit" ]] || continue
                path="${hit%%:*}"
                rest="${hit#*:}"
                line="${rest%%:*}"
                text="${rest#*:}"
                mark=""
                is_changed "$repo" "$path" && mark=" [changed]"
                echo "- $repo \`$path:$line\`$mark $(sed 's/^[[:space:]]*//' <<< "$text" | cut -c1-200)"
            done < <(hits_in "$root" "$term" "$(tree_of "$root")")
        done
        if [[ "$include_docs" == "true" ]]; then
            while IFS= read -r hit; do
                [[ -n "$hit" ]] || continue
                path="${hit%%:*}"
                rest="${hit#*:}"
                echo "- workspace \`$path:${rest%%:*}\` $(sed 's/^[[:space:]]*//' <<< "${rest#*:}" | cut -c1-200)"
            done < <(hits_in "$DOCS_ROOT" "$term" "" "${docs_paths[@]}")
        fi
    } > "$hits_file"
    count=$(wc -l < "$hits_file" | tr -d ' ')
    if [[ "$count" -eq 0 ]]; then
        echo "No hits."
    else
        head -n "$MAX_HITS" "$hits_file"
        if [[ "$count" -gt "$MAX_HITS" ]]; then
            echo "- … and $((count - MAX_HITS)) more hits not shown"
        fi
    fi
    echo
done

echo "## Searched"
echo
for place in "${searched[@]}"; do
    echo "- $place"
done
