#!/bin/bash
# Transition a JIRA ticket to a new status
# Usage: ./transition-ticket.sh TICKET_KEY STATUS
#
# Examples:
#   ./transition-ticket.sh EUDPA-12345 "In Dev"
#   ./transition-ticket.sh EUDPA-12345 "In Review"
#   ./transition-ticket.sh EUDPA-12345 "Done"

set -e

TICKET_KEY="$1"
TARGET_STATUS="$2"

show_help() {
    cat << EOF
Transition a JIRA ticket to a new status

Usage: ./transition-ticket.sh TICKET_KEY STATUS

Arguments:
  TICKET_KEY  The JIRA ticket key (e.g., EUDPA-12345)
  STATUS      The target status name (e.g., "In Dev", "In Review", "Done")

Examples:
  ./transition-ticket.sh EUDPA-12345 "In Dev"
  ./transition-ticket.sh EUDPA-12345 "In Review"
  ./transition-ticket.sh EUDPA-12345 "Done"

To list available transitions:
  ./transition-ticket.sh EUDPA-12345 --list

Environment Variables:
  JIRA_USER   Your Atlassian email address
  JIRA_TOKEN  Your Atlassian API token
EOF
    exit 0
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
fi

# Validate arguments
if [[ -z "$TICKET_KEY" ]]; then
    echo "Error: Ticket key is required"
    echo "Usage: ./transition-ticket.sh TICKET_KEY STATUS"
    exit 1
fi

# Check environment variables
USER="${JIRA_USER:-}"
if [[ -z "$USER" ]]; then
    echo "Error: JIRA_USER environment variable not set"
    exit 1
fi

if [[ -z "$JIRA_TOKEN" ]]; then
    echo "Error: JIRA_TOKEN environment variable not set"
    exit 1
fi

AUTH="$USER:$JIRA_TOKEN"
BASE_URL="${JIRA_BASE_URL:?JIRA_BASE_URL is not set - see README.md}"

# Get available transitions
transitions_response=$(curl -s -X GET \
    -u "$AUTH" \
    -H "Content-Type: application/json" \
    "$BASE_URL/rest/api/2/issue/$TICKET_KEY/transitions")

# Check for errors
if echo "$transitions_response" | jq -e '.errorMessages' > /dev/null 2>&1 && [[ $(echo "$transitions_response" | jq '.errorMessages | length') -gt 0 ]]; then
    echo "Error:"
    echo "$transitions_response" | jq -r '.errorMessages[]'
    exit 1
fi

# List transitions if requested or no status provided
if [[ "$TARGET_STATUS" == "--list" || -z "$TARGET_STATUS" ]]; then
    echo "Available transitions for $TICKET_KEY (transition -> the status it leads to):"
    echo "$transitions_response" | jq -r '.transitions[] | "  - \(.name) -> \(.to.name)"'
    echo ""
    echo "A status can differ from the transition that reaches it. Configure and compare status names."
    exit 0
fi

# Find the transition ID for the target status
TRANSITION_ID=$(echo "$transitions_response" | jq -r --arg status "$TARGET_STATUS" \
    '.transitions[] | select(.name == $status or .to.name == $status) | .id' | head -1)
RESULT_STATUS=$(echo "$transitions_response" | jq -r --arg id "$TRANSITION_ID" \
    '.transitions[] | select(.id == $id) | .to.name' | head -1)

if [[ -z "$TRANSITION_ID" || "$TRANSITION_ID" == "null" ]]; then
    echo "Error: Status '$TARGET_STATUS' not available for $TICKET_KEY"
    echo ""
    echo "Available transitions (transition -> the status it leads to):"
    echo "$transitions_response" | jq -r '.transitions[] | "  - \(.name) -> \(.to.name)"'
    exit 1
fi

# Execute the transition
transition_response=$(curl -s -X POST \
    -u "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"transition\": {\"id\": \"$TRANSITION_ID\"}}" \
    "$BASE_URL/rest/api/2/issue/$TICKET_KEY/transitions")

# Check for errors in response
if [[ -n "$transition_response" ]]; then
    if echo "$transition_response" | jq -e '.errorMessages' > /dev/null 2>&1; then
        echo "Error transitioning ticket:"
        echo "$transition_response" | jq -r '.errorMessages[]'
        exit 1
    fi
fi

echo "$TICKET_KEY -> $RESULT_STATUS"
if [[ "$RESULT_STATUS" != "$TARGET_STATUS" ]]; then
    echo "Note: '$TARGET_STATUS' is a transition; the ticket's status is now '$RESULT_STATUS'."
fi
echo "Updated: $BASE_URL/browse/$TICKET_KEY"
