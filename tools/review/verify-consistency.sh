#!/bin/bash
# Verify consistency review coverage for a ticket
# Usage: ./verify-consistency.sh EUDPA-XXXXX [--json]
#
# Checks that every repo in the review has a non-empty _consistency-check.md
# and updates _CONSISTENCY_VERIFICATION.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TICKET="${1:-}"
JSON_OUTPUT=false

if [[ "$2" == "--json" ]] || [[ "$1" == "--json" ]]; then
    JSON_OUTPUT=true
    [[ "$1" == "--json" ]] && TICKET="$2"
fi

if [[ -z "$TICKET" ]]; then
    echo "Usage: ./verify-consistency.sh EUDPA-XXXXX [--json]"
    echo ""
    echo "Verifies all repos have a completed _consistency-check.md."
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
[[ -d "$FILE_REVIEWS_DIR" ]] || error "File reviews directory not found. Run prepare-review.sh first."

# Read repos from meta
prs_json=$(jq '.prs' "$META_FILE")
pr_count=$(echo "$prs_json" | jq 'length')

# Check if consistency theme is active
themes=$(jq -r '.themes // ["code"] | join(",")' "$META_FILE")
if [[ "$themes" != *"consistency"* ]]; then
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        jq -n \
            --arg ticket "$TICKET" \
            '{"ticket": $ticket, "skipped": true, "reason": "consistency theme not enabled for this review"}'
    else
        echo "Consistency theme not enabled for $TICKET (themes: $themes)"
        echo "Re-run prepare-review.sh to add consistency stubs."
    fi
    exit 0
fi

# Collect repo statuses
all_repos=()
all_statuses=()
pending_list=()
total_repos=0
reviewed_count=0

for ((i=0; i<pr_count; i++)); do
    repo=$(echo "$prs_json" | jq -r ".[$i].repo")

    # Deduplicate repos (a repo may appear in multiple PRs)
    already_seen=false
    for seen in "${all_repos[@]:-}"; do
        [[ "$seen" == "$repo" ]] && already_seen=true && break
    done
    [[ "$already_seen" == "true" ]] && continue

    ((total_repos++))
    all_repos+=("$repo")

    stub="$FILE_REVIEWS_DIR/$repo/_consistency-check.md"

    if [[ -f "$stub" ]] && [[ -s "$stub" ]]; then
        all_statuses+=("reviewed")
        ((reviewed_count++))
    elif [[ -f "$stub" ]]; then
        all_statuses+=("pending")
        pending_list+=("$repo")
    else
        all_statuses+=("missing")
        pending_list+=("$repo")
    fi
done

# Calculate coverage
pending_count=${#pending_list[@]}

if [[ "$total_repos" -gt 0 ]]; then
    coverage_pct=$((reviewed_count * 100 / total_repos))
else
    coverage_pct=100
fi

if [[ "$pending_count" -eq 0 ]]; then
    coverage_status="100%"
    is_complete=true
else
    coverage_status="${coverage_pct}%"
    is_complete=false
fi

# Write verification file
verification_file="$FILE_REVIEWS_DIR/_CONSISTENCY_VERIFICATION.md"

{
    echo "# Consistency Review Coverage Verification"
    echo ""
    echo "**Ticket:** $TICKET"
    echo "**Last Verified:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "**Total repos:** $total_repos"
    echo "**Consistency checks completed:** $reviewed_count"
    echo "**Coverage:** $coverage_status"
    echo ""
    echo "## Repo Checklist"
    echo ""
    echo "| # | Repository | Status |"
    echo "|---|------------|--------|"

    for ((i=0; i<${#all_repos[@]}; i++)); do
        repo="${all_repos[$i]}"
        status="${all_statuses[$i]}"
        case "$status" in
            reviewed) status_icon="✅ Complete" ;;
            pending)  status_icon="⏳ Pending" ;;
            missing)  status_icon="❌ Missing" ;;
        esac
        echo "| $((i+1)) | $repo | $status_icon |"
    done

    echo ""
    echo "## Verification Result"
    echo ""
    if [[ "$is_complete" == "true" ]]; then
        echo "- [x] **CONFIRMED: All consistency checks complete**"
    else
        echo "- [ ] **INCOMPLETE: ${pending_count} repo(s) pending consistency review**"
        echo ""
        echo "### Pending"
        echo ""
        for repo in "${pending_list[@]}"; do
            echo "- \`$repo\` → \`file-reviews/$repo/_consistency-check.md\`"
        done
    fi
} > "$verification_file"

# Output
if [[ "$JSON_OUTPUT" == "true" ]]; then
    pending_json=$(printf '%s\n' "${pending_list[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
    jq -n \
        --arg ticket "$TICKET" \
        --argjson total "$total_repos" \
        --argjson reviewed "$reviewed_count" \
        --argjson pending "$pending_count" \
        --arg coverage "$coverage_status" \
        --argjson complete "$is_complete" \
        --argjson pending_repos "$pending_json" \
        '{
            ticket: $ticket,
            total: $total,
            reviewed: $reviewed,
            pending: $pending,
            coverage: $coverage,
            complete: $complete,
            pending_repos: $pending_repos
        }'
else
    echo ""
    echo "=== Consistency Coverage Verification ==="
    echo "Ticket: $TICKET"
    echo "Coverage: $reviewed_count / $total_repos repos ($coverage_status)"
    echo ""

    if [[ "$is_complete" == "true" ]]; then
        echo "✅ All consistency checks complete"
    else
        echo "⏳ Pending $pending_count consistency check(s):"
        for repo in "${pending_list[@]}"; do
            echo "  - $repo"
        done
    fi

    echo ""
    echo "Updated: $verification_file"

    if [[ "$is_complete" == "true" ]]; then
        echo ""
        echo "Ready to write repo summaries and review.md."
    fi
fi
