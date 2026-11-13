#!/bin/bash
# Run a JQL query against Jira (handles pagination)
# Usage: ./search.sh "<jql>" [format] [--fields f1,f2,...]
# Formats: list (default), summary, json
#
# Examples:
#   ./search.sh "project = EUDPA AND reporter = currentUser() AND statusCategory != Done"
#   ./search.sh "project = EUDPA AND parent = EUDPA-215" json
#   ./search.sh "key in (EUDPA-216, EUDPA-217)" summary
#
# Boundary: this is the general JQL surface. For single tickets use
# tools/jira/ticket.sh.

set -e

JQL=""
FORMAT="list"
FIELDS="summary,status,issuetype,priority,labels,parent,reporter,assignee,customfield_10008"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --fields)
            FIELDS="$2"
            shift 2
            ;;
        -h|--help)
            sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            if [[ -z "$JQL" ]]; then
                JQL="$1"
            else
                FORMAT="$1"
            fi
            shift
            ;;
    esac
done

if [[ -z "$JQL" ]]; then
    echo "Usage: ./search.sh \"<jql>\" [format] [--fields f1,f2,...]" >&2
    echo "Formats: list (default), summary, json" >&2
    exit 1
fi

USER="${JIRA_USER:-}"
if [[ -z "$USER" ]]; then
    echo "Error: JIRA_USER environment variable not set" >&2
    exit 1
fi

if [[ -z "$JIRA_TOKEN" ]]; then
    echo "Error: JIRA_TOKEN environment variable not set" >&2
    exit 1
fi

AUTH="$USER:$JIRA_TOKEN"
BASE_URL="${JIRA_BASE_URL:?JIRA_BASE_URL is not set - see README.md}"

ALL_ISSUES="[]"
NEXT_PAGE_TOKEN=""
MAX_RESULTS=100

while true; do
    response=$(curl -s -u "$AUTH" \
        -H "Content-Type: application/json" \
        -G \
        --data-urlencode "jql=$JQL" \
        --data-urlencode "fields=$FIELDS" \
        --data-urlencode "nextPageToken=$NEXT_PAGE_TOKEN" \
        --data-urlencode "maxResults=$MAX_RESULTS" \
        "$BASE_URL/rest/api/3/search/jql")

    if echo "$response" | jq -e '.errorMessages' > /dev/null 2>&1; then
        echo "$response" | jq -r '.errorMessages[]' >&2
        exit 1
    fi

    PAGE_ISSUES=$(echo "$response" | jq '.issues // []')
    PAGE_COUNT=$(echo "$PAGE_ISSUES" | jq 'length')
    NEXT_PAGE_TOKEN=$(echo "$response" | jq -r '.nextPageToken // ""')

    ALL_ISSUES=$(echo "$ALL_ISSUES $PAGE_ISSUES" | jq -s 'add')

    if [[ -z "$NEXT_PAGE_TOKEN" ]] || [[ $PAGE_COUNT -eq 0 ]]; then
        break
    fi

    echo "Fetched $(echo "$ALL_ISSUES" | jq 'length') issues..." >&2
done

case "$FORMAT" in
    json)
        echo "$ALL_ISSUES" | jq '{issues: ., total: (. | length)}'
        ;;
    summary)
        echo "$ALL_ISSUES" | jq -r '.[] | {
            key: .key,
            summary: .fields.summary,
            status: .fields.status.name,
            type: .fields.issuetype.name,
            priority: (.fields.priority.name // "-"),
            parent: ((.fields.parent.key // .fields.customfield_10008) // "-"),
            reporter: (.fields.reporter.displayName // "-"),
            assignee: (.fields.assignee.displayName // "Unassigned"),
            labels: .fields.labels
        }'
        ;;
    list|*)
        echo "$ALL_ISSUES" | jq -r '.[] | "\(.key)\t\(.fields.issuetype.name)\t\(.fields.status.name)\t\((.fields.parent.key // .fields.customfield_10008) // "-")\t\(.fields.summary)"' | column -t -s $'\t'
        echo ""
        echo "Total: $(echo "$ALL_ISSUES" | jq 'length') issues" >&2
        ;;
esac
