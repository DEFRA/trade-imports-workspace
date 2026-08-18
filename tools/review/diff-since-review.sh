#!/bin/bash
# Get diff since last review for all repos in a ticket
# Usage: ./diff-since-review.sh EUDPA-XXXXX [--json]
#
# Outputs changed files since the last review, per repo.
# Updates .review-meta.json with new commit info for re-review tracking.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TICKET="${1:-}"
JSON_OUTPUT=false

if [[ "$2" == "--json" ]] || [[ "$1" == "--json" ]]; then
    JSON_OUTPUT=true
    [[ "$1" == "--json" ]] && TICKET="$2"
fi

if [[ -z "$TICKET" ]]; then
    echo "Usage: ./diff-since-review.sh EUDPA-XXXXX [--json]"
    echo ""
    echo "Gets files changed since the last review."
    echo "Compares reviewed commit with current PR head."
    exit 1
fi

REVIEW_DIR="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"
META_FILE="$REVIEW_DIR/.review-meta.json"

# Helper for output
log() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo "$1"
    fi
}

error() {
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        echo "{\"error\": \"$1\"}"
    else
        echo "Error: $1" >&2
    fi
    exit 1
}

# Check prerequisites
[[ -d "$REVIEW_DIR" ]] || error "Review directory not found. Run prepare-review.sh first."
[[ -f "$META_FILE" ]] || error "Meta file not found. Run prepare-review.sh first."
command -v jq >/dev/null 2>&1 || error "jq is required"
command -v gh >/dev/null 2>&1 || error "GitHub CLI (gh) is required"

# Read meta
prs_json=$(jq '.prs' "$META_FILE")
pr_count=$(echo "$prs_json" | jq 'length')
review_date=$(jq -r '.created' "$META_FILE")

log "=== Diff Since Review ==="
log "Ticket: $TICKET"
log "Last review: $review_date"
log ""

# Collect results
results=()
total_changed=0

for ((i=0; i<pr_count; i++)); do
    repo=$(echo "$prs_json" | jq -r ".[$i].repo")
    pr_number=$(echo "$prs_json" | jq -r ".[$i].pr")
    reviewed_commit=$(echo "$prs_json" | jq -r ".[$i].commit")

    repo_dir="$REVIEW_DIR/repos/$repo"

    if [[ ! -d "$repo_dir" ]]; then
        log "Skipping $repo - repo not cloned"
        continue
    fi

    log "Checking $repo#$pr_number..."

    # Get current PR head commit (prefer GitHub, fallback to local repo HEAD)
    current_commit=""
    current_commit=$(gh pr view "$pr_number" --repo "DEFRA/$repo" --json headRefOid --jq '.headRefOid' 2>/dev/null || true)
    if [[ -z "$current_commit" || "$current_commit" == "null" ]]; then
        current_commit=$(cd "$repo_dir" && git rev-parse HEAD 2>/dev/null || true)
        if [[ -n "$current_commit" ]]; then
            log "  GitHub lookup failed; using local HEAD ${current_commit:0:7}"
        else
            log "  Could not get current commit (GitHub and local HEAD failed)"
            continue
        fi
    fi

    if [[ "$current_commit" == "$reviewed_commit" ]]; then
        log "  No changes (still at ${reviewed_commit:0:7})"
        results+=("{\"repo\": \"$repo\", \"pr\": $pr_number, \"reviewed_commit\": \"$reviewed_commit\", \"current_commit\": \"$current_commit\", \"changed\": false, \"files\": []}")
        continue
    fi

    log "  Changes detected: ${reviewed_commit:0:7} -> ${current_commit:0:7}"

    # Fetch only the PR ref — a bare `git fetch origin` here would pull
    # every branch incl. gh-pages on clones with the default refspec.
    (
        cd "$repo_dir"
        git fetch --quiet origin "pull/$pr_number/head:pr-$pr_number" 2>/dev/null || true
    )

    # Get changed files between commits
    changed_files=$(cd "$repo_dir" && git diff --name-only "$reviewed_commit".."$current_commit" 2>/dev/null) || {
        # Try fetching the specific commits if diff fails
        (cd "$repo_dir" && git fetch --quiet --depth=100 origin "$current_commit" 2>/dev/null) || true
        changed_files=$(cd "$repo_dir" && git diff --name-only "$reviewed_commit".."$current_commit" 2>/dev/null) || {
            log "  Could not compute diff"
            continue
        }
    }

    # Count and format files
    file_count=0
    files_json="["
    first=true

    while IFS= read -r filepath; do
        [[ -z "$filepath" ]] && continue
        ((file_count++))
        ((total_changed++))

        # Get change type
        change_type="modified"
        if ! (cd "$repo_dir" && git show "$reviewed_commit:$filepath" >/dev/null 2>&1); then
            change_type="added"
        elif ! (cd "$repo_dir" && git show "$current_commit:$filepath" >/dev/null 2>&1); then
            change_type="deleted"
        fi

        if [[ "$first" == "true" ]]; then
            first=false
        else
            files_json+=","
        fi
        files_json+="{\"path\": \"$filepath\", \"change_type\": \"$change_type\"}"

        log "    $change_type: $filepath"
    done <<< "$changed_files"

    files_json+="]"

    log "  Total: $file_count file(s) changed"

    results+=("{\"repo\": \"$repo\", \"pr\": $pr_number, \"reviewed_commit\": \"$reviewed_commit\", \"current_commit\": \"$current_commit\", \"changed\": true, \"file_count\": $file_count, \"files\": $files_json}")
done

# Build output JSON
results_json=$(printf '%s\n' "${results[@]}" | jq -s '.')

# Append a snapshot to .re_reviews[] (preserves prior snapshots so the next refresh
# can diff "since prior refresh"). Also keeps .re_review pointing at the latest
# entry for backwards compatibility with anything that still reads it.
snapshot="{
    \"re_review_started\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"original_review\": \"$review_date\",
    \"changes\": $results_json
}"
jq --argjson snap "$snapshot" '
    . + {
        re_review: $snap,
        re_reviews: (((.re_reviews // []) + [$snap]))
    }
' "$META_FILE" > "$META_FILE.tmp" && mv "$META_FILE.tmp" "$META_FILE"

# Output
if [[ "$JSON_OUTPUT" == "true" ]]; then
    jq -n \
        --arg ticket "$TICKET" \
        --arg review_date "$review_date" \
        --argjson total "$total_changed" \
        --argjson repos "$results_json" \
        '{
            ticket: $ticket,
            last_review: $review_date,
            total_files_changed: $total,
            repos: $repos
        }'
else
    echo ""
    echo "=== Summary ==="
    echo "Total files changed since review: $total_changed"
    echo ""

    if [[ "$total_changed" -eq 0 ]]; then
        echo "No changes detected. PRs are at the same commits as when reviewed."
    else
        echo "Re-review needed for $total_changed file(s)."
        echo "Run file-review agents for changed files, then compare with original findings."
    fi
fi
