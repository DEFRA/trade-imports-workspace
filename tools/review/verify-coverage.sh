#!/bin/bash
# Verify file review coverage for a ticket
# Usage: ./verify-coverage.sh EUDPA-XXXXX [--json]
#
# Checks that every changed file has a review and updates _VERIFICATION.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TICKET="${1:-}"
JSON_OUTPUT=false

if [[ "$2" == "--json" ]] || [[ "$1" == "--json" ]]; then
    JSON_OUTPUT=true
    [[ "$1" == "--json" ]] && TICKET="$2"
fi

if [[ -z "$TICKET" ]]; then
    echo "Usage: ./verify-coverage.sh EUDPA-XXXXX [--json]"
    echo ""
    echo "Verifies all changed files have review files."
    exit 1
fi

REVIEW_DIR="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"
META_FILE="$REVIEW_DIR/.review-meta.json"
FILE_REVIEWS_DIR="$REVIEW_DIR/file-reviews"

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
[[ -d "$FILE_REVIEWS_DIR" ]] || error "File reviews directory not found. Run init-file-reviews.sh first."

# Read meta
prs_json=$(jq '.prs' "$META_FILE")
pr_count=$(echo "$prs_json" | jq 'length')

# Collect all files and their status using parallel arrays (bash 3 compatible)
all_repos=()
all_files=()
all_statuses=()
pending_list=()
total_files=0
reviewed_count=0

for ((i=0; i<pr_count; i++)); do
    repo=$(echo "$prs_json" | jq -r ".[$i].repo")
    pr_number=$(echo "$prs_json" | jq -r ".[$i].pr")

    # Get file list from PR
    files=$("$HOME/git/defra/trade-imports-workspace/tools/github/pr-details.sh" "$repo" "$pr_number" files 2>/dev/null) || continue

    while IFS= read -r filepath; do
        [[ -z "$filepath" ]] && continue
        ((total_files++))

        # Check for review file (JSON-canonical; reviewed iff verdict set)
        safe_path=$(echo "$filepath" | tr '/' '_')
        review_file="$FILE_REVIEWS_DIR/$repo/${safe_path}.review.json"

        all_repos+=("$repo")
        all_files+=("$filepath")

        if [[ -f "$review_file" ]] && jq -e '.verdict != null' "$review_file" > /dev/null 2>&1; then
            all_statuses+=("reviewed")
            ((reviewed_count++))
        elif [[ -f "$review_file" ]]; then
            all_statuses+=("pending")
            pending_list+=("$repo|$filepath")
        else
            all_statuses+=("missing")
            pending_list+=("$repo|$filepath")
        fi
    done <<< "$files"
done

# Calculate coverage
pending_count=${#pending_list[@]}

if [[ "$total_files" -gt 0 ]]; then
    coverage_pct=$((reviewed_count * 100 / total_files))
else
    coverage_pct=0
fi

# Determine overall status
if [[ "$pending_count" -eq 0 ]]; then
    coverage_status="100%"
    is_complete=true
else
    coverage_status="${coverage_pct}%"
    is_complete=false
fi

# Update verification file
verification_file="$FILE_REVIEWS_DIR/_VERIFICATION.md"

{
    echo "# File Review Coverage Verification"
    echo ""
    echo "**Ticket:** $TICKET"
    echo "**Last Verified:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "**Total files changed:** $total_files"
    echo "**Files reviewed:** $reviewed_count"
    echo "**Coverage:** $coverage_status"
    echo ""
    echo "## Changed Files Checklist"
    echo ""
    echo "| # | Repository | Changed File | Status |"
    echo "|---|------------|--------------|--------|"

    for ((i=0; i<${#all_files[@]}; i++)); do
        repo="${all_repos[$i]}"
        filepath="${all_files[$i]}"
        status="${all_statuses[$i]}"
        case "$status" in
            reviewed) status_icon="✅ Reviewed" ;;
            pending)  status_icon="⏳ Pending" ;;
            missing)  status_icon="❌ Missing" ;;
        esac
        echo "| $((i+1)) | $repo | \`$filepath\` | $status_icon |"
    done

    echo ""
    echo "## Verification Result"
    echo ""
    if [[ "$is_complete" == "true" ]]; then
        echo "- [x] **CONFIRMED: All files have been reviewed**"
    else
        echo "- [ ] **INCOMPLETE: ${pending_count} file(s) pending review**"
        echo ""
        echo "### Pending Reviews"
        echo ""
        for entry in "${pending_list[@]}"; do
            IFS='|' read -r repo filepath <<< "$entry"
            echo "- \`$repo/$filepath\`"
        done
    fi
} > "$verification_file"

# Output
if [[ "$JSON_OUTPUT" == "true" ]]; then
    pending_json=$(printf '%s\n' "${pending_list[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
    jq -n \
        --arg ticket "$TICKET" \
        --argjson total "$total_files" \
        --argjson reviewed "$reviewed_count" \
        --argjson pending "$pending_count" \
        --arg coverage "$coverage_status" \
        --argjson complete "$is_complete" \
        --argjson pending_files "$pending_json" \
        '{
            ticket: $ticket,
            total: $total,
            reviewed: $reviewed,
            pending: $pending,
            coverage: $coverage,
            complete: $complete,
            pending_files: $pending_files
        }'
else
    echo ""
    echo "=== Coverage Verification ==="
    echo "Ticket: $TICKET"
    echo "Coverage: $reviewed_count / $total_files files ($coverage_status)"
    echo ""

    if [[ "$is_complete" == "true" ]]; then
        echo "✅ All files reviewed"
    else
        echo "⏳ Pending $pending_count review(s):"
        for entry in "${pending_list[@]}"; do
            IFS='|' read -r repo filepath <<< "$entry"
            echo "  - $repo/$filepath"
        done
    fi

    echo ""
    echo "Updated: $verification_file"

    if [[ "$is_complete" == "true" ]]; then
        echo ""
        echo "Ready to write review-index.md and review.{repo}.md summaries."
    fi
fi
