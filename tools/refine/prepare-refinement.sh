#!/bin/bash
# Prepare a refinement workspace for a JIRA ticket.
# Usage: ./prepare-refinement.sh EUDPA-XXXXX [--json]
#
# Fetches the ticket + comments + linked Confluence pages from Jira,
# writes a populated ticket.md, seeds .refinement-meta.json with
# verdict=null, and stubs review.md from the refinement template.
#
# Does NOT clone repos and does NOT bake per-repo best-practices.
# The skill reads the workspace's existing
# ~/git/defra/trade-imports-workspace/repos/<repo>/ trees directly when
# it needs to peek at code.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ASSETS="$HOME/git/defra/trade-imports-workspace/.claude/skills/ticket-refiner/assets"

TICKET=""
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            TICKET="$1"
            shift
            ;;
    esac
done

if [[ -z "$TICKET" ]]; then
    echo "Usage: ./prepare-refinement.sh EUDPA-XXXXX [--json]"
    exit 1
fi

REFINE_DIR="$HOME/git/defra/trade-imports-workspace/workareas/ticket-refinement/$TICKET"

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

command -v jq >/dev/null 2>&1 || error "jq is required"

log "Creating refinement workspace..."
mkdir -p "$REFINE_DIR"

log "Fetching ticket details..."
ticket_json=$("$HOME/git/defra/trade-imports-workspace/tools/jira/ticket.sh" "$TICKET" json 2>/dev/null) || error "Failed to fetch ticket $TICKET"

ticket_key=$(echo "$ticket_json" | jq -r '.key')
ticket_summary=$(echo "$ticket_json" | jq -r '.fields.summary')
ticket_type=$(echo "$ticket_json" | jq -r '.fields.issuetype.name')
ticket_status=$(echo "$ticket_json" | jq -r '.fields.status.name')
ticket_priority=$(echo "$ticket_json" | jq -r '.fields.priority.name // "None"')
ticket_assignee=$(echo "$ticket_json" | jq -r '.fields.assignee.displayName // "Unassigned"')
ticket_parent=$(echo "$ticket_json" | jq -r '.fields.parent.key // "None"')
ticket_labels_json=$(echo "$ticket_json" | jq -c '.fields.labels // []')
ticket_labels=$(echo "$ticket_labels_json" | jq -r 'join(", ")')
ticket_description=$(echo "$ticket_json" | jq -r '.renderedFields.description // "No description"')

log "Fetching comments..."
comments_json=$("$HOME/git/defra/trade-imports-workspace/tools/jira/comments.sh" "$TICKET" json 2>/dev/null) || comments_json="[]"
comments_count=$(echo "$comments_json" | jq 'length')

log "Checking for Confluence links..."
_atlassian_base="${JIRA_BASE_URL:?JIRA_BASE_URL is not set - see README.md}"
confluence_links=$(echo "$ticket_description" | grep -oE "${_atlassian_base}/wiki/spaces/[^\"<>[:space:]]+" | sort -u || true)
confluence_content=""

if [[ -n "$confluence_links" ]]; then
    while IFS= read -r link; do
        [[ -z "$link" ]] && continue
        log "  Fetching: $link"
        page_content=$("$HOME/git/defra/trade-imports-workspace/tools/confluence/page.sh" "$link" 2>/dev/null) || continue
        confluence_content+="### $(echo "$page_content" | head -2 | tail -1 | sed 's/Title: //')"$'\n\n'
        confluence_content+="$page_content"$'\n\n'
    done <<< "$confluence_links"
fi

comments_formatted=""
if [[ "$comments_count" -gt 0 ]]; then
    comments_formatted=$(echo "$comments_json" | jq -r '.[] | "### \(.author.displayName) (\(.created | split("T")[0]))\n\(.body)\n"')
fi

log "Writing ticket.md..."
cat > "$REFINE_DIR/ticket.md" << EOF
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

log "Writing .refinement-meta.json..."
created_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
meta_tmp=$(mktemp)
jq -n \
    --arg ticket "$ticket_key" \
    --arg summary "$ticket_summary" \
    --arg type "$ticket_type" \
    --arg priority "$ticket_priority" \
    --arg parent "$ticket_parent" \
    --argjson labels "$ticket_labels_json" \
    --arg status "$ticket_status" \
    --arg created "$created_at" \
    '{
        ticket: $ticket,
        summary: $summary,
        type: $type,
        priority: $priority,
        parent: $parent,
        labels: $labels,
        status: $status,
        created: $created,
        verdict: null,
        verdict_reason: null,
        completed_at: null
    }' > "$meta_tmp"
mv "$meta_tmp" "$REFINE_DIR/.refinement-meta.json"

log "Stubbing review.md..."
template="$SKILL_ASSETS/refinement-template.md"
if [[ ! -f "$template" ]]; then
    error "Refinement template not found at $template"
fi

ac_rows=""
priority_row="**Priority:** $ticket_priority"

today=$(date -u +"%Y-%m-%d")

review_tmp=$(mktemp)
awk \
    -v ticket="$ticket_key" \
    -v summary="$ticket_summary" \
    -v ttype="$ticket_type" \
    -v priority="$ticket_priority" \
    -v today="$today" \
    '{
        gsub(/EUDPA-XXXXX/, ticket)
        gsub(/\[Ticket summary\]/, summary)
        gsub(/\[Date\]/, today)
        gsub(/\[Story\/Bug\/Task\]/, ttype)
        gsub(/\[Priority\]/, priority)
        print
    }' "$template" > "$review_tmp"

if [[ -f "$REFINE_DIR/review.md" ]] && [[ -s "$REFINE_DIR/review.md" ]]; then
    log "  review.md already present — leaving in place (run from scratch by deleting it first)"
    rm -f "$review_tmp"
else
    mv "$review_tmp" "$REFINE_DIR/review.md"
fi

if [[ "$JSON_OUTPUT" == "true" ]]; then
    cat "$REFINE_DIR/.refinement-meta.json"
else
    echo ""
    echo "=== Refinement Workspace Ready ==="
    echo "Ticket: $ticket_key ($ticket_type)"
    echo "Summary: $ticket_summary"
    echo "Directory: $REFINE_DIR"
    echo ""
    echo "Created:"
    echo "  ✓ ticket.md"
    echo "  ✓ .refinement-meta.json (verdict: null)"
    echo "  ✓ review.md (stub from template)"
    echo ""
    echo "Next: fill review.md, then run refine-finalize.sh $ticket_key --verdict {READY|NEEDS WORK|SPIKE REQUIRED}"
fi
