#!/bin/bash
# Write every finding and every verdict for a group of reviewed files in one
# call. Used by the per-type review agents in place of one
# file-review-add-item.sh call per finding and one file-review-set-verdict.sh
# call per file.
#
# Usage:
#   file-review-write.sh ID --from GROUP.json
#
# ID is the ticket (EUDPA-X) or, in local mode, the composite
# local/<repo>/<branch> id.
#
# GROUP.json is a list with one object per reviewed file:
#   [
#     {"repo": "r", "file": "src/A.java", "verdict": "NEEDS_ATTENTION",
#      "reason": "one sentence",
#      "findings": [
#        {"line": 10, "severity": "Major", "category": "structure",
#         "issue": "...", "fix": "Must: ... One way: ...",
#         "best_practice": "java/modern-java.md"}
#      ]},
#     {"repo": "r", "file": "src/B.java", "verdict": "SAFE",
#      "reason": "one sentence", "findings": []}
#   ]
#
# Each finding goes through file-review-add-item.sh and each verdict through
# file-review-set-verdict.sh, so the same checks apply. Every file's
# placeholder must already exist. All or nothing: if any finding or verdict
# is refused, every file in the group is put back as it was.
#
# Prints one line per file: "<repo> <file>: <n> findings, <verdict>".

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/batch-lib.sh"

ID=""
FROM=""

usage() {
    sed -n '2,31p' "$0" | sed 's/^# \{0,1\}//'
    exit "${1:-1}"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --from) FROM="$2"; shift 2 ;;
        -h|--help) usage 0 ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) ID="$1"; shift ;;
    esac
done

[[ -z "$ID" ]] && { echo "Missing ID" >&2; usage; }
[[ -z "$FROM" ]] && { echo "Missing --from" >&2; usage; }
batch_check_list "$FROM" || exit 1

review_dir="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$ID"

targets=()
while IFS=$'\t' read -r repo file; do
    targets+=("$review_dir/file-reviews/$repo/${file//\//_}.review.json")
done < <(jq -r '.[] | [(.repo // ""), (.file // "")] | @tsv' "$FROM")
batch_snapshot "${targets[@]}"

fail() {
    batch_restore
    echo "$1" >&2
    echo "Nothing written: every file in $FROM put back as it was." >&2
    exit 1
}

count=$(jq 'length' "$FROM")
summary=""
for ((i = 0; i < count; i++)); do
    repo=$(jq -r ".[$i].repo // empty" "$FROM")
    file=$(jq -r ".[$i].file // empty" "$FROM")
    [[ -n "$repo" && -n "$file" ]] || fail "Entry $((i + 1)): needs repo and file"

    findings=$(jq ".[$i].findings // [] | length" "$FROM")
    for ((j = 0; j < findings; j++)); do
        args=()
        while IFS= read -r -d '' a; do args+=("$a"); done < <(batch_args "$FROM" ".[$i].findings[$j]")
        if ! out=$(bash "$SCRIPT_DIR/file-review-add-item.sh" "$ID" --repo "$repo" --file "$file" "${args[@]}" 2>&1); then
            fail "$file finding $((j + 1)): $out"
        fi
    done

    verdict=$(jq -r ".[$i].verdict // empty" "$FROM")
    reason=$(jq -r ".[$i].reason // empty" "$FROM")
    if ! out=$(bash "$SCRIPT_DIR/file-review-set-verdict.sh" "$ID" --repo "$repo" --file "$file" \
            --verdict "$verdict" --reason "$reason" 2>&1); then
        fail "$file verdict: $out"
    fi
    summary+="$repo $file: $findings findings, $verdict"$'\n'
done

batch_done
printf '%s' "$summary"
