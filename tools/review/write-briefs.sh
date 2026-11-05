#!/bin/bash
# Write one brief per review group, so a reviewer reads everything it needs
# in one call. Run plan-groups.sh first.
#
# Usage:
#   write-briefs.sh ID [--max-file-bytes N]
#
# ID is the ticket (EUDPA-X) or the local id (local/<repo>/<branch>).
# --max-file-bytes is the largest file copied into a brief whole
# (default 50000). A larger file gets its diff and the path to read it at.
#
# Writes briefs/<group id>.md in the review workarea for every group in
# groups.json, in this order:
#   1. the type's instructions (the review skill's references/types/<type>.md)
#   2. the house rules (.claude/rules/code-quality.md)
#   3. the ticket (ticket.md, or branch.md in local mode)
#   4. the group's guides
#   5. the group: repo, PR, commit and file list
#   6. each file's diff and its content at the reviewed commit
#
# Prints one line per brief: its path and size in bytes.

set -euo pipefail

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
TYPES_DIR="$WORKSPACE/.claude/skills/review/references/types"

ID=""
MAX_FILE_BYTES=50000

usage() {
    sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'
    exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --max-file-bytes) MAX_FILE_BYTES="$2"; shift 2 ;;
        -h|--help) usage 0 ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) ID="$1"; shift ;;
    esac
done

[[ -n "$ID" ]] || { echo "Missing ID" >&2; usage; }

REVIEW_DIR="$WORKSPACE/workareas/reviews/$ID"
GROUPS_FILE="$REVIEW_DIR/groups.json"
[[ -f "$GROUPS_FILE" ]] || { echo "No groups.json in $REVIEW_DIR; run plan-groups.sh first" >&2; exit 1; }

is_local=$(jq -r '.local // false' "$REVIEW_DIR/.review-meta.json")

ticket_file="$REVIEW_DIR/ticket.md"
[[ -f "$ticket_file" ]] || ticket_file="$REVIEW_DIR/branch.md"
[[ -f "$ticket_file" ]] || { echo "No ticket.md or branch.md in $REVIEW_DIR" >&2; exit 1; }

repo_dir() {
    if [[ "$is_local" == "true" ]]; then
        echo "$WORKSPACE/repos/$1"
    else
        echo "$REVIEW_DIR/repos/$1"
    fi
}

placeholder_of() {
    echo "$REVIEW_DIR/file-reviews/$1/${2//\//_}.review.json"
}

local_branch=$(jq -r '.branch // empty' "$REVIEW_DIR/.review-meta.json")

# In local mode the branch under review may not be checked out. When it is,
# the working tree (uncommitted changes included) is what gets reviewed.
branch_is_checked_out() {
    [[ "$(git -C "$1" rev-parse --abbrev-ref HEAD)" == "$local_branch" ]]
}

local_merge_base() {
    git -C "$1" merge-base origin/main "$local_branch" 2> /dev/null \
        || git -C "$1" merge-base main "$local_branch"
}

diff_of() {
    local repo="$1" file="$2" pr="$3" root
    if [[ "$is_local" == "true" ]]; then
        root=$(repo_dir "$repo")
        if branch_is_checked_out "$root"; then
            git -C "$root" diff "$(local_merge_base "$root")" -- "$file"
        else
            git -C "$root" diff "$(local_merge_base "$root")" "$local_branch" -- "$file"
        fi
    else
        bash "$WORKSPACE/tools/github/file-diff.sh" "$repo" "$pr" "$file" --ticket "$ID"
    fi
}

# Prints the file as reviewed, or nothing and status 1 when the change deleted it.
content_of() {
    local root="$1" file="$2"
    if [[ "$is_local" == "true" ]] && ! branch_is_checked_out "$root"; then
        git -C "$root" show "$local_branch:$file" 2> /dev/null
    elif [[ -f "$root/$file" ]]; then
        cat "$root/$file"
    else
        return 1
    fi
}

fence_language() {
    case "$1" in
        *.java) echo java ;;
        *.js|*.mjs|*.cjs) echo js ;;
        *.ts) echo ts ;;
        *.njk) echo njk ;;
        *.md) echo markdown ;;
        *.json|*.jsonc) echo json ;;
        *.yml|*.yaml) echo yaml ;;
        *.xml) echo xml ;;
        *.sh) echo bash ;;
        *.scss) echo scss ;;
        *) echo text ;;
    esac
}

write_brief() {
    local group="$1" type repo root first pr commit
    type=$(jq -r '.type' <<< "$group")
    repo=$(jq -r '.repo' <<< "$group")
    root=$(repo_dir "$repo")
    first=$(placeholder_of "$repo" "$(jq -r '.files[0]' <<< "$group")")
    pr=$(jq -r '.pr // "none"' "$first")
    commit=$(jq -r '.commit // "unknown"' "$first")

    echo "# Review brief: $type"
    echo
    if [[ -f "$TYPES_DIR/$type.md" ]]; then
        cat "$TYPES_DIR/$type.md"
    else
        echo "No type instructions yet: follow your agent instructions."
    fi
    echo
    echo "## House rules"
    echo
    cat "$WORKSPACE/.claude/rules/code-quality.md"
    echo
    echo "## Ticket"
    echo
    cat "$ticket_file"
    echo
    echo "## Guides"
    while IFS= read -r guide; do
        echo
        echo "### Source: \`$guide\`"
        echo
        if [[ -f "$WORKSPACE/$guide" ]]; then
            cat "$WORKSPACE/$guide"
        else
            echo "(Missing: $WORKSPACE/$guide)"
        fi
    done < <(jq -r '.guides[]' <<< "$group")
    echo
    echo "## Your group"
    echo
    echo "- Review id: $ID"
    echo "- Group: $(jq -r '.id' <<< "$group")"
    echo "- Repo: $repo"
    echo "- PR: $pr"
    echo "- Commit reviewed: $commit"
    echo "- Repo checkout: $root"
    echo "- Files:"
    jq -r '.files[] | "  - `\(.)`"' <<< "$group"

    while IFS= read -r file; do
        echo
        echo "## File: \`$file\`"
        echo
        echo "### Diff"
        echo
        echo '```diff'
        diff_of "$repo" "$file" "$pr" || echo "(No diff found for this file.)"
        echo '```'
        echo
        local content size
        if ! content=$(content_of "$root" "$file"); then
            echo "Deleted by this change."
            continue
        fi
        size=$(printf '%s' "$content" | wc -c | tr -d ' ')
        if [[ "$size" -gt "$MAX_FILE_BYTES" ]]; then
            echo "Too large to copy here ($size bytes). Read it at \`$root/$file\`."
        else
            echo "### File at the reviewed commit"
            echo
            echo "\`\`\`$(fence_language "$file")"
            printf '%s\n' "$content"
            echo '```'
        fi
    done < <(jq -r '.files[]' <<< "$group")
}

mkdir -p "$REVIEW_DIR/briefs"
jq -c '.groups[]' "$GROUPS_FILE" | while IFS= read -r group; do
    out="$REVIEW_DIR/briefs/$(jq -r '.id' <<< "$group").md"
    write_brief "$group" > "$out"
    echo "$out $(wc -c < "$out" | tr -d ' ')"
done
