#!/bin/bash
# Pre-bake plan context for a ticket — one allowlisted dispatch in place of
# PLANNER hand-typing ticket.sh + comments.sh + N × detect-tech.sh.
#
# Usage: prepare-plan.sh EUDPA-XXXXX [--repos repo1,repo2] [--json]
#
# Writes workareas/ticket-planning/EUDPA-XXXXX/:
#   - ticket.md             ticket metadata + description + comments + Confluence refs
#   - .plan-meta.json       ticket metadata + per-repo tech list
#   - best-practices/<repo>.md   concatenated best-practices applicable to each repo
#
# Affected repos are resolved from --repos when given; otherwise the
# script leaves the repo list empty and the PLANNER persona picks them
# during the plan.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"

TICKET=""
REPOS=""
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --repos)
            REPOS="$2"
            shift 2
            ;;
        -h|--help)
            sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        EUDPA-*)
            TICKET="$1"
            shift
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

if [[ -z "$TICKET" ]]; then
    echo "Usage: $0 EUDPA-XXXXX [--repos repo1,repo2] [--json]" >&2
    exit 1
fi

command -v jq >/dev/null 2>&1 || { echo "Error: jq is required" >&2; exit 1; }

PLAN_DIR="$WORKSPACE/workareas/ticket-planning/$TICKET"
mkdir -p "$PLAN_DIR/best-practices"

log() {
    if [[ "$JSON_OUTPUT" == "false" ]]; then
        echo "$1"
    fi
}

log "Fetching ticket details..."
ticket_json=$("$WORKSPACE/tools/jira/ticket.sh" "$TICKET" json 2>/dev/null) || {
    echo "Error: failed to fetch ticket $TICKET" >&2
    exit 1
}

ticket_key=$(echo "$ticket_json" | jq -r '.key')
ticket_summary=$(echo "$ticket_json" | jq -r '.fields.summary')
ticket_type=$(echo "$ticket_json" | jq -r '.fields.issuetype.name')
ticket_status=$(echo "$ticket_json" | jq -r '.fields.status.name')
ticket_priority=$(echo "$ticket_json" | jq -r '.fields.priority.name')
ticket_assignee=$(echo "$ticket_json" | jq -r '.fields.assignee.displayName // "Unassigned"')
ticket_parent=$(echo "$ticket_json" | jq -r '.fields.parent.key // "None"')
ticket_labels=$(echo "$ticket_json" | jq -r '.fields.labels | join(", ")')
ticket_description=$(echo "$ticket_json" | jq -r '.renderedFields.description // "No description"')

log "Fetching comments..."
comments_json=$("$WORKSPACE/tools/jira/comments.sh" "$TICKET" json 2>/dev/null) || comments_json="[]"
comments_count=$(echo "$comments_json" | jq 'length')

log "Checking for Confluence links..."
_atlassian_base="${JIRA_BASE_URL:?JIRA_BASE_URL is not set - see README.md}"
confluence_links=$(echo "$ticket_description" | grep -oE "${_atlassian_base}/wiki/spaces/[^\"<>[:space:]]+" | sort -u || true)
confluence_content=""

if [[ -n "$confluence_links" ]]; then
    while IFS= read -r link; do
        [[ -z "$link" ]] && continue
        log "  Fetching: $link"
        page_content=$("$WORKSPACE/tools/confluence/page.sh" "$link" 2>/dev/null) || continue
        confluence_content+="### $(echo "$page_content" | head -2 | tail -1 | sed 's/Title: //')"$'\n\n'
        confluence_content+="$page_content"$'\n\n'
    done <<< "$confluence_links"
fi

comments_formatted=""
if [[ "$comments_count" -gt 0 ]]; then
    comments_formatted=$(echo "$comments_json" | jq -r '.[] | "### \(.author.displayName) (\(.created | split("T")[0]))\n\(.body)\n"')
fi

log "Writing ticket.md..."
cat > "$PLAN_DIR/ticket.md" << EOF
# $ticket_key: $ticket_summary

## Metadata
- **Type:** $ticket_type
- **Status:** $ticket_status
- **Priority:** $ticket_priority
- **Labels:** $ticket_labels
- **Parent:** $ticket_parent
- **Assignee:** $ticket_assignee

## Description

$ticket_description

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments ($comments_count)

$comments_formatted

## Confluence References

$confluence_content
EOF

# Detect tech for each repo passed via --repos.
repo_entries="[]"
if [[ -n "$REPOS" ]]; then
    log ""
    log "Detecting tech per repo..."
    repo_entries_json=()
    IFS=',' read -ra REPO_ARRAY <<< "$REPOS"
    for repo in "${REPO_ARRAY[@]}"; do
        repo=$(echo "$repo" | xargs)
        [[ -z "$repo" ]] && continue
        repo_dir="$WORKSPACE/repos/$repo"
        if [[ ! -d "$repo_dir" ]]; then
            log "  ! $repo: repo not found at $repo_dir — skipping"
            continue
        fi
        tech_json=$("$WORKSPACE/tools/review/detect-tech.sh" "$repo_dir" 2>/dev/null) || tech_json='{"technologies":[],"best_practices":[]}'
        tech_list=$(echo "$tech_json" | jq -r '.technologies | join(", ")')
        log "  ✓ $repo [$tech_list]"

        out="$PLAN_DIR/best-practices/$repo.md"
        {
            echo "# Best practices applicable to $repo"
            echo
            echo "Concatenated from \`docs/best-practices/\` at prepare-plan time."
            echo "Apply these standards when planning changes in this repo."
            echo
            echo "$tech_json" | jq -r '.best_practices[]?' | while IFS= read -r path; do
                [[ -z "$path" ]] && continue
                src="$WORKSPACE/$path"
                if [[ -f "$src" ]]; then
                    echo
                    echo "---"
                    echo
                    echo "## Source: \`$path\`"
                    echo
                    cat "$src"
                else
                    echo
                    echo "---"
                    echo
                    echo "## Source: \`$path\` (missing — check detect-tech.sh)"
                fi
            done
        } > "$out"

        repo_entries_json+=("$(jq -n --arg repo "$repo" --argjson tech "$tech_json" '{repo: $repo, tech: $tech}')")
    done
    if [[ ${#repo_entries_json[@]} -gt 0 ]]; then
        repo_entries=$(printf '%s\n' "${repo_entries_json[@]}" | jq -s '.')
    fi
fi

cat > "$PLAN_DIR/.plan-meta.json" << EOF
{
    "ticket": "$ticket_key",
    "summary": $(jq -Rn --arg s "$ticket_summary" '$s'),
    "type": "$ticket_type",
    "status": "$ticket_status",
    "priority": "$ticket_priority",
    "parent": "$ticket_parent",
    "labels": $(jq -Rn --arg s "$ticket_labels" '$s | split(", ") | map(select(. != ""))'),
    "created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "repos": $repo_entries
}
EOF

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$PLAN_DIR/.plan-meta.json"
else
    echo ""
    echo "=== Plan Workspace Ready ==="
    echo "Ticket: $ticket_key ($ticket_type)"
    echo "Summary: $ticket_summary"
    echo "Directory: $PLAN_DIR"
    echo ""
    echo "Created:"
    echo "  ✓ ticket.md"
    echo "  ✓ .plan-meta.json"
    if [[ -n "$REPOS" ]]; then
        echo "  ✓ best-practices/{repo}.md"
    else
        echo "  (no --repos passed; PLANNER persona resolves repos and may re-run with --repos to bake best-practices bundles)"
    fi
    echo ""
    echo "Next: PLANNER persona authors plan.md"
fi
