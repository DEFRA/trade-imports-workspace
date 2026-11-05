#!/bin/bash
# Sort a review's files into review groups: one file type, one repo, at most
# --max files each, shared out evenly. Writes groups.json in the review
# workarea and prints it.
#
# Usage:
#   plan-groups.sh ID [--max N]
#
# ID is the ticket (EUDPA-X) or the local id (local/<repo>/<branch>).
# --max is the most files one group holds (default 10).
#
# Reads the files still to review from file-reviews/*/*.review.json (those
# with no verdict yet), and the review types from the review skill's
# assets/routing.json:
#   fileRoutes   first route that matches a file decides its type. A route
#                may name repos it applies to. In a match pattern * also
#                matches across folders.
#   reviewTypes  each type's agent and guides. guidesIf adds guides when any
#                file in the group contains a pattern or matches a path.
#                A type whose agent is null gets no reviewer: its files are
#                listed under "skipped".
#
# Within a repo and type, files are sorted by path, then split into the
# fewest groups the cap allows, as evenly as possible: 11 files and a cap
# of 10 make groups of 6 and 5, not 10 and 1.
#
# groups.json:
#   {"max": 10,
#    "groups": [{"id": "repo--java-source--1", "repo": "...", "type": "...",
#                "agent": "...", "files": [...], "guides": [...]}],
#    "skipped": [{"repo": "...", "file": "...", "type": "lockfile"}]}

set -euo pipefail

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
ROUTING="$WORKSPACE/.claude/skills/review/assets/routing.json"

ID=""
MAX=10

usage() {
    sed -n '2,31p' "$0" | sed 's/^# \{0,1\}//'
    exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --max) MAX="$2"; shift 2 ;;
        -h|--help) usage 0 ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) ID="$1"; shift ;;
    esac
done

[[ -n "$ID" ]] || { echo "Missing ID" >&2; usage; }
[[ "$MAX" =~ ^[1-9][0-9]*$ ]] || { echo "--max must be a whole number above 0" >&2; exit 1; }

REVIEW_DIR="$WORKSPACE/workareas/reviews/$ID"
META="$REVIEW_DIR/.review-meta.json"
[[ -f "$META" ]] || { echo "No review workarea at $REVIEW_DIR" >&2; exit 1; }
jq -e '.reviewTypes and .fileRoutes' "$ROUTING" > /dev/null \
    || { echo "$ROUTING has no reviewTypes and fileRoutes" >&2; exit 1; }
unknown_types=$(jq -r '.reviewTypes as $types | [.fileRoutes[].type | select($types[.] == null)] | unique | join(", ")' "$ROUTING")
[[ -z "$unknown_types" ]] \
    || { echo "File routes name types $ROUTING does not define: $unknown_types" >&2; exit 1; }

is_local=$(jq -r '.local // false' "$META")

repo_dir() {
    if [[ "$is_local" == "true" ]]; then
        echo "$WORKSPACE/repos/$1"
    else
        echo "$REVIEW_DIR/repos/$1"
    fi
}

route_type() {
    local repo="$1" file="$2" route pattern
    while IFS= read -r route; do
        if jq -e --arg repo "$repo" 'has("repos") and (.repos | index($repo) | not)' <<< "$route" > /dev/null; then
            continue
        fi
        while IFS= read -r pattern; do
            # shellcheck disable=SC2053
            if [[ "$file" == $pattern ]]; then
                jq -r '.type' <<< "$route"
                return
            fi
        done < <(jq -r '.match[]' <<< "$route")
    done < <(jq -c '.fileRoutes[]' "$ROUTING")
    echo ""
}

routed=$(
    # A file under a dot folder (.github/, .claude/) has a placeholder name
    # starting with a dot, which * leaves out unless dotglob is on.
    shopt -s dotglob nullglob
    for placeholder in "$REVIEW_DIR"/file-reviews/*/*.review.json; do
        [[ "$(jq -r '.verdict // "null"' "$placeholder")" == "null" ]] || continue
        repo=$(jq -r '.repo' "$placeholder")
        file=$(jq -r '.file' "$placeholder")
        jq -nc --arg repo "$repo" --arg file "$file" --arg type "$(route_type "$repo" "$file")" \
            '{repo: $repo, file: $file, type: $type}'
    done | jq -s '.'
)

unrouted=$(jq '[.[] | select(.type == "")]' <<< "$routed")
if [[ "$(jq 'length' <<< "$unrouted")" -gt 0 ]]; then
    echo "No file route matches these files; add one to $ROUTING:" >&2
    jq -r '.[] | "  \(.repo) \(.file)"' <<< "$unrouted" >&2
    exit 1
fi

planned=$(jq --argjson max "$MAX" --slurpfile routing "$ROUTING" '
    def split_evenly($files):
        ($files | length) as $count
        | (($count + $max - 1) / $max | floor) as $groups
        | ($count / $groups | floor) as $base
        | ($count % $groups) as $larger
        | [range(0; $groups)] | map(
            . as $index
            | ($index * $base + ([$index, $larger] | min)) as $start
            | ($base + (if $index < $larger then 1 else 0 end)) as $size
            | $files[$start:($start + $size)]);
    ($routing[0].reviewTypes) as $types
    | {
      max: $max,
      skipped: [.[] | select($types[.type].agent == null)] | sort_by(.repo, .file),
      groups: (
        [.[] | select($types[.type].agent != null)]
        | group_by([.repo, .type])
        | map(
            .[0] as $first
            | (map(.file) | sort) as $files
            | split_evenly($files)
            | to_entries
            | map({
                id: "\($first.repo)--\($first.type)--\(.key + 1)",
                repo: $first.repo,
                type: $first.type,
                agent: $types[$first.type].agent,
                files: .value
              }))
        | flatten)
    }' <<< "$routed")

with_guides=$(
    jq -c '.groups[]' <<< "$planned" | while IFS= read -r group; do
        type=$(jq -r '.type' <<< "$group")
        repo=$(jq -r '.repo' <<< "$group")
        root=$(repo_dir "$repo")
        guides=$(jq -c --arg type "$type" '.reviewTypes[$type].guides' "$ROUTING")
        while IFS= read -r rule; do
            hit=false
            while IFS= read -r file; do
                if jq -e 'has("path")' <<< "$rule" > /dev/null; then
                    pattern=$(jq -r '.path' <<< "$rule")
                    # shellcheck disable=SC2053
                    if [[ "$file" == $pattern ]]; then hit=true; fi
                elif grep -qE "$(jq -r '.contains' <<< "$rule")" "$root/$file" 2> /dev/null; then
                    hit=true
                fi
                if [[ "$hit" == true ]]; then break; fi
            done < <(jq -r '.files[]' <<< "$group")
            if [[ "$hit" == true ]]; then
                guides=$(jq -c --argjson more "$(jq -c '.guides' <<< "$rule")" '. + $more | reduce .[] as $guide ([]; if index($guide) then . else . + [$guide] end)' <<< "$guides")
            fi
        done < <(jq -c --arg type "$type" '.reviewTypes[$type].guidesIf[]' "$ROUTING")
        jq -c --argjson guides "$guides" '. + {guides: $guides}' <<< "$group"
    done | jq -s '.'
)

jq --argjson groups "$with_guides" '.groups = $groups' <<< "$planned" > "$REVIEW_DIR/groups.json"
cat "$REVIEW_DIR/groups.json"
