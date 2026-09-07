#!/bin/bash
# Delete a JIRA issue link by its numeric id
# Usage: ./delete-link.sh --id 426407
#        ./delete-link.sh TICKET-KEY --list
#
# Options:
#   --list        List a ticket's issue links (id, type, other side) and exit
#   --id ID       Delete one issue link by its numeric id
#   -h, --help    Show this help message
#
# link-tickets.sh creates links; this is the delete half. Jira's issueLink
# id isn't shown anywhere in the UI — get it from --list (or from
# ticket.sh TICKET json | jq '.fields.issuelinks').

set -e

show_help() {
    cat << EOF
Delete a JIRA issue link by its numeric id

Usage: ./delete-link.sh --id 426407
       ./delete-link.sh TICKET-KEY --list

Options:
  --list        List a ticket's issue links (id, type, other side) and exit
  --id ID       Delete one issue link by its numeric id
  -h, --help    Show this help message

Environment Variables:
  JIRA_USER      Your Atlassian email address
  JIRA_TOKEN     Your Atlassian API token
  JIRA_BASE_URL  e.g. https://eaflood.atlassian.net

Examples:
  ./delete-link.sh EUDPA-368 --list
  ./delete-link.sh --id 426407
EOF
    exit 0
}

TICKET=""
BY_ID=""
LIST_ONLY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) show_help ;;
        --list) LIST_ONLY=true; shift ;;
        --id) BY_ID="${2:?--id needs a link id}"; shift 2 ;;
        -*) echo "Error: unknown option: $1" >&2; exit 1 ;;
        *)
            if [[ -z "$TICKET" ]]; then TICKET="$1"
            else echo "Error: unexpected argument: $1" >&2; exit 1
            fi
            shift
            ;;
    esac
done

USER="${JIRA_USER:?JIRA_USER is not set}"
TOKEN="${JIRA_TOKEN:?JIRA_TOKEN is not set}"
BASE_URL="${JIRA_BASE_URL:?JIRA_BASE_URL is not set}"

if [[ -n "$BY_ID" ]]; then
    status=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE \
        -u "$USER:$TOKEN" \
        "$BASE_URL/rest/api/2/issueLink/$BY_ID")

    case "$status" in
        204) echo "Deleted: issue link id $BY_ID" ;;
        403) echo "Error: not permitted to delete link $BY_ID" >&2; exit 1 ;;
        404) echo "Error: no issue link with id $BY_ID" >&2; exit 1 ;;
        *)   echo "Error: delete failed with HTTP $status" >&2; exit 1 ;;
    esac
    exit 0
fi

if [[ -z "$TICKET" ]]; then
    echo "Error: give a ticket key with --list, or --id ID to delete" >&2
    exit 1
fi

if [[ "$LIST_ONLY" != true ]]; then
    echo "Error: give --list (to see link ids) or --id ID (to delete one)" >&2
    exit 1
fi

response=$(curl -s -u "$USER:$TOKEN" \
    -H "Content-Type: application/json" \
    "$BASE_URL/rest/api/2/issue/$TICKET?fields=issuelinks")

if ! echo "$response" | jq -e '.fields.issuelinks' >/dev/null 2>&1; then
    echo "Error: could not read issue links for $TICKET" >&2
    echo "$response" | jq -r '.errorMessages[]? // .' >&2
    exit 1
fi

count=$(echo "$response" | jq '.fields.issuelinks | length')
if [[ "$count" == "0" ]]; then
    echo "$TICKET has no issue links"
    exit 0
fi

echo "$response" | jq -r '.fields.issuelinks[] |
    "\(.id)\t\(.type.name)\t\(if .outwardIssue then "outward -> " + .outwardIssue.key else "inward <- " + .inwardIssue.key end)"'
