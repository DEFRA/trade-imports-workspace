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
#   1. the type's instructions: the files its reviewTypes entry in the
#      review skill's assets/routing.json lists, from references/types/
#   2. the house rules (.claude/rules/code-quality.md)
#   3. the ticket (ticket.md, or branch.md in local mode)
#   4. the group's guides
#   5. the group: repo, PR, commit and file list
#   6. each file's diff and its content at the reviewed commit, every line
#      numbered as it is in the file
#   7. for a type whose reviewTypes entry sets sourceUnderTest, the source
#      file each test covers: its diff when the review changed it, and its
#      content. A Java test FooTest, FooTests or FooIT covers Foo.java (in
#      the same package, else the one Foo.java under src/main/java); a Node
#      test foo.test.js covers foo.js (or .mjs, .ts) beside it.
#
# Also makes the findings/, ac/ and consistency/ folders the reviewers
# write to.
#
# Prints one line per brief: its path and size in bytes.

set -euo pipefail

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
TYPES_DIR="$WORKSPACE/.claude/skills/review/references/types"
ROUTING="$WORKSPACE/.claude/skills/review/assets/routing.json"

ID=""
MAX_FILE_BYTES=50000

usage() {
    sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
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

exists_at_commit() {
    local root="$1" file="$2"
    if [[ "$is_local" == "true" ]] && ! branch_is_checked_out "$root"; then
        git -C "$root" cat-file -e "$local_branch:$file" 2> /dev/null
    else
        [[ -f "$root/$file" ]]
    fi
}

java_main_files_named() {
    local root="$1" name="$2"
    if [[ "$is_local" == "true" ]] && ! branch_is_checked_out "$root"; then
        git -C "$root" ls-tree -r --name-only "$local_branch" -- src/main/java | grep "/$name\.java$" || true
    elif [[ -d "$root/src/main/java" ]]; then
        (cd "$root" && find src/main/java -name "$name.java")
    fi
}

# Prints the source file a test covers, or nothing when none is found.
source_under_test() {
    local root="$1" file="$2" name candidate matches stem ext
    case "$file" in
        src/test/java/*.java)
            name=$(basename "$file" .java)
            for suffix in Tests Test IT; do
                if [[ "$name" == *"$suffix" && "$name" != "$suffix" ]]; then
                    name="${name%"$suffix"}"
                    break
                fi
            done
            candidate="$(dirname "src/main/java/${file#src/test/java/}")/$name.java"
            if exists_at_commit "$root" "$candidate"; then
                echo "$candidate"
                return
            fi
            matches=$(java_main_files_named "$root" "$name")
            [[ -n "$matches" && $(wc -l <<< "$matches" | tr -d ' ') -eq 1 ]] && echo "$matches"
            ;;
        *.test.js | *.test.mjs | *.test.ts)
            stem="${file%.test.*}"
            for ext in "${file##*.test.}" js mjs ts; do
                if exists_at_commit "$root" "$stem.$ext"; then
                    echo "$stem.$ext"
                    return
                fi
            done
            ;;
    esac
    return 0
}

# Prints a file's content with its line numbers, or a pointer when it is
# over the size cap, or a note when the change deleted it.
print_content() {
    local root="$1" file="$2" content size
    if ! content=$(content_of "$root" "$file"); then
        echo "Deleted by this change."
        return
    fi
    size=$(printf '%s' "$content" | wc -c | tr -d ' ')
    if [[ "$size" -gt "$MAX_FILE_BYTES" ]]; then
        echo "Too large to copy here ($size bytes). Read it at \`$root/$file\`."
    else
        echo "### File at the reviewed commit, with line numbers"
        echo
        echo "\`\`\`$(fence_language "$file")"
        printf '%s\n' "$content" | awk '{ printf "%5d  %s\n", NR, $0 }'
        echo '```'
    fi
}

print_diff() {
    local repo="$1" file="$2" pr="$3"
    echo "### Diff"
    echo
    echo '```diff'
    diff_of "$repo" "$file" "$pr" || echo "(No diff found for this file.)"
    echo '```'
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
    while IFS= read -r instructions; do
        echo
        if [[ -f "$TYPES_DIR/$instructions" ]]; then
            cat "$TYPES_DIR/$instructions"
        else
            echo "(Missing instructions: $TYPES_DIR/$instructions)"
        fi
    done < <(jq -r --arg type "$type" '.reviewTypes[$type].instructions // [] | .[]' "$ROUTING")
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
        print_diff "$repo" "$file" "$pr"
        echo
        print_content "$root" "$file"
    done < <(jq -r '.files[]' <<< "$group")

    [[ "$(jq -r --arg type "$type" '.reviewTypes[$type].sourceUnderTest // false' "$ROUTING")" == "true" ]] || return 0

    local file source
    local -a sources=() tests=()
    while IFS= read -r file; do
        source=$(source_under_test "$root" "$file")
        [[ -n "$source" ]] || continue
        sources+=("$source")
        tests+=("$file")
    done < <(jq -r '.files[]' <<< "$group")

    echo
    echo "## Source under test"
    if [[ ${#sources[@]} -eq 0 ]]; then
        echo
        echo "No source file was found for the tests in this group."
        return 0
    fi
    local i j seen
    for i in "${!sources[@]}"; do
        seen=false
        for ((j = 0; j < i; j++)); do
            [[ "${sources[$j]}" == "${sources[$i]}" ]] && seen=true
        done
        [[ "$seen" == "true" ]] && continue
        echo
        echo "## Source: \`${sources[$i]}\`"
        echo
        echo "Tested by:"
        for j in "${!sources[@]}"; do
            [[ "${sources[$j]}" == "${sources[$i]}" ]] && echo "- \`${tests[$j]}\`"
        done
        echo
        local placeholder
        placeholder=$(placeholder_of "$repo" "${sources[$i]}")
        if [[ -f "$placeholder" ]]; then
            print_diff "$repo" "${sources[$i]}" "$(jq -r '.pr // "none"' "$placeholder")"
        else
            echo "Not changed by this review."
        fi
        echo
        print_content "$root" "${sources[$i]}"
    done
}

mkdir -p "$REVIEW_DIR/briefs" "$REVIEW_DIR/findings" "$REVIEW_DIR/ac" "$REVIEW_DIR/consistency"
jq -c '.groups[]' "$GROUPS_FILE" | while IFS= read -r group; do
    out="$REVIEW_DIR/briefs/$(jq -r '.id' <<< "$group").md"
    write_brief "$group" > "$out"
    echo "$out $(wc -c < "$out" | tr -d ' ')"
done
