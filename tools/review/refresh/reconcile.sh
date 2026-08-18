#!/bin/bash
# Fold refresh findings (.review.json todos) into items.{repo}.json.
#
# Usage:
#   refresh/reconcile.sh EUDPA-X --repo R [--dry-run] [--json] [--force]
#
# Contract: refresh reviewers write current findings to their per-file
# .review.json. The persona instructs them to NOT re-report items
# already in items.{repo}.json — only new findings and regressions of
# Fix+Done items. This script trusts that contract and appends every
# todo as a new consolidated item via review-add-item.sh.
#
# Idempotent: each processed .review.json gets a `reconciled_at`
# timestamp; re-runs skip files already reconciled. Pass --force to
# re-process anyway.
#
# Advisory: emits a list of Fix+Done items in refreshed files so the
# user can spot-check potential regressions.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADD_ITEM="$SCRIPT_DIR/../review-add-item.sh"

TICKET=""
REPO=""
DRY_RUN=0
JSON=0
FORCE=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --repo) REPO="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        --json) JSON=1; shift ;;
        --force) FORCE=1; shift ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$TICKET" ]] && { echo "Missing ticket" >&2; exit 1; }
[[ -z "$REPO" ]] && { echo "Missing --repo" >&2; exit 1; }

review_dir="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"
file_review_dir="$review_dir/file-reviews/$REPO"
items_file="$review_dir/items.${REPO}.json"

[[ -d "$file_review_dir" ]] || { echo "No file-reviews dir: $file_review_dir" >&2; exit 1; }
[[ -f "$items_file" ]] || { echo "No items file: $items_file (run aggregate-file-reviews.sh --write-items first)" >&2; exit 1; }

# Collect candidate .review.json files.
candidate_files=()
while IFS= read -r f; do candidate_files+=("$f"); done < <(find "$file_review_dir" -maxdepth 1 -name '*.review.json' | sort)

[[ ${#candidate_files[@]} -eq 0 ]] && { echo "No .review.json files in $file_review_dir" >&2; exit 1; }

# Partition into to-process vs already-reconciled vs not-yet-reviewed.
# A .review.json is in scope when:
#   - reviewed_at is set (a reviewer actually ran), AND
#   - reconciled_at is null OR older than reviewed_at OR --force.
# Placeholders (reviewed_at == null) are ignored entirely.
to_process=()
already_done=()
unreviewed=()
for f in "${candidate_files[@]}"; do
    reviewed_at=$(jq -r '.reviewed_at // ""' "$f")
    reconciled_at=$(jq -r '.reconciled_at // ""' "$f")

    if [[ -z "$reviewed_at" ]]; then
        unreviewed+=("$f")
    elif [[ "$FORCE" == "1" ]]; then
        to_process+=("$f")
    elif [[ -z "$reconciled_at" ]]; then
        to_process+=("$f")
    elif [[ "$reviewed_at" > "$reconciled_at" ]]; then
        to_process+=("$f")
    else
        already_done+=("$f")
    fi
done

# Collect new-item actions and refreshed file set.
declare -a added_ids
declare -a added_descriptions
refreshed_files=()

for f in "${to_process[@]}"; do
    file_path=$(jq -r '.file' "$f")
    refreshed_files+=("$file_path")

    todo_count=$(jq '.todos | length' "$f")
    for ((i=0; i<todo_count; i++)); do
        todo=$(jq -c ".todos[$i]" "$f")
        line=$(echo "$todo" | jq -r '.line')
        severity=$(echo "$todo" | jq -r '.severity')
        category=$(echo "$todo" | jq -r '.category')
        issue=$(echo "$todo" | jq -r '.issue')
        fix=$(echo "$todo" | jq -r '.fix')
        bp=$(echo "$todo" | jq -r '.best_practice // empty')

        if [[ "$DRY_RUN" == "1" ]]; then
            added_ids+=("(dry-run)")
            added_descriptions+=("$file_path:$line [$severity] $issue")
            continue
        fi

        args=( "$TICKET" --repo "$REPO" --file "$file_path" --line "$line" \
               --severity "$severity" --category "$category" \
               --issue "$issue" --fix "$fix" )
        [[ -n "$bp" ]] && args+=( --best-practice "$bp" )

        new_id=$("$ADD_ITEM" "${args[@]}")
        added_ids+=("$new_id")
        added_descriptions+=("$file_path:$line [$severity] $issue")
    done

    # Mark reconciled.
    if [[ "$DRY_RUN" != "1" ]]; then
        now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        jq --arg t "$now" '. + {reconciled_at: $t}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
    fi
done

# Spot-check advisory: prior Fix+Done items in refreshed files.
spot_check_json="[]"
if [[ ${#refreshed_files[@]} -gt 0 ]]; then
    files_json=$(printf '%s\n' "${refreshed_files[@]}" | jq -R . | jq -s '.')
    spot_check_json=$(jq --argjson refreshed "$files_json" '
        [.items[]
            | select(
                (.disposition == "Fix") and
                (.status == "Done") and
                (.file as $f | $refreshed | index($f) != null)
              )
            | {id, file, line, issue, notes}
        ]
    ' "$items_file")
fi

arr_to_json() {
    if [[ "$#" -eq 0 ]]; then
        echo '[]'
    else
        printf '%s\n' "$@" | jq -R . | jq -s '.'
    fi
}

added_json=$(arr_to_json "${added_descriptions[@]+"${added_descriptions[@]}"}")
added_ids_json=$(arr_to_json "${added_ids[@]+"${added_ids[@]}"}")

if [[ "$JSON" == "1" ]]; then
    jq -n \
        --argjson added "$added_json" \
        --argjson added_ids "$added_ids_json" \
        --argjson skipped "${#already_done[@]}" \
        --argjson unreviewed "${#unreviewed[@]}" \
        --argjson spot_check "$spot_check_json" \
        '{
            added_count: ($added | length),
            added: $added,
            added_ids: $added_ids,
            skipped_already_reconciled: $skipped,
            skipped_unreviewed: $unreviewed,
            spot_check: $spot_check
        }'
    exit 0
fi

# Human output.
echo "Reconcile $TICKET / $REPO"
echo
echo "  Refreshed files:           ${#to_process[@]}"
echo "  Already reconciled (skip): ${#already_done[@]}"
echo "  Unreviewed placeholders:   ${#unreviewed[@]}"
echo "  New items added:           ${#added_descriptions[@]}"
[[ "$DRY_RUN" == "1" ]] && echo "  (dry-run — no mutations)"
echo

if [[ ${#added_descriptions[@]} -gt 0 ]]; then
    echo "Added:"
    for ((i=0; i<${#added_descriptions[@]}; i++)); do
        echo "  #${added_ids[$i]} — ${added_descriptions[$i]}"
    done
    echo
fi

spot_check_count=$(echo "$spot_check_json" | jq 'length')
if [[ "$spot_check_count" -gt 0 ]]; then
    echo "Spot-check (Fix+Done items in refreshed files — verify they have not regressed):"
    echo "$spot_check_json" | jq -r '.[] | "  #\(.id) \(.file):\(.line) — \(.issue)\(if .notes then " (fixed at \(.notes))" else "" end)"'
fi
