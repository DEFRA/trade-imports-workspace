#!/bin/bash
# Move JIRA tickets out of a board's backlog and onto the board itself.
# Usage: ./move-to-board.sh BOARD_ID TICKET_KEY [TICKET_KEY...]
#
# This is the API equivalent of right-clicking a card in the Backlog view and
# choosing Move -> Move to Board. Board membership is NOT a field on the issue:
# two tickets identical in every field can sit one on the board and one in the
# backlog, so there is nothing to read back and nothing to set with
# update-ticket.sh. It is the board's own ranking, and this endpoint is the only
# way to change it.
#
# Setting a working status does not do this. A ticket moved to "In Dev" while
# still in the backlog stays in the backlog, invisible on the board.
#
# The call is idempotent: moving a ticket already on the board is a no-op that
# still exits 0, so it is safe to run on every ticket every time.
#
# Examples:
#   ./move-to-board.sh 13780 EUDPA-12345
#   ./move-to-board.sh 13780 EUDPA-12345 EUDPA-12346

set -e

show_help() {
    cat << EOF
Move JIRA tickets out of a board's backlog and onto the board

Usage: ./move-to-board.sh BOARD_ID TICKET_KEY [TICKET_KEY...]

Arguments:
  BOARD_ID    The JIRA board id (the EUDPA board is 13780)
  TICKET_KEY  One or more ticket keys (e.g., EUDPA-12345)

Examples:
  ./move-to-board.sh 13780 EUDPA-12345
  ./move-to-board.sh 13780 EUDPA-12345 EUDPA-12346

Notes:
  Board membership is not a field on the issue, so there is nothing to read
  back afterwards. Transitioning a ticket to a working status does NOT move it
  onto the board - that is a separate action, and this script is it.
  Re-running against a ticket already on the board is a harmless no-op.

  At most 50 tickets per call (a Jira limit).

Environment Variables:
  JIRA_USER      Your Atlassian email address
  JIRA_TOKEN     Your Atlassian API token
  JIRA_BASE_URL  Your Atlassian site URL
EOF
    exit 0
}

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
fi

BOARD_ID="${1:-}"
shift || true

if [[ -z "$BOARD_ID" ]]; then
    echo "Error: Board id is required"
    echo "Usage: ./move-to-board.sh BOARD_ID TICKET_KEY [TICKET_KEY...]"
    exit 1
fi

if [[ ! "$BOARD_ID" =~ ^[0-9]+$ ]]; then
    echo "Error: Board id must be numeric, got '$BOARD_ID'"
    echo "Usage: ./move-to-board.sh BOARD_ID TICKET_KEY [TICKET_KEY...]"
    exit 1
fi

if [[ $# -eq 0 ]]; then
    echo "Error: At least one ticket key is required"
    echo "Usage: ./move-to-board.sh BOARD_ID TICKET_KEY [TICKET_KEY...]"
    exit 1
fi

if [[ $# -gt 50 ]]; then
    echo "Error: At most 50 tickets per call, got $#"
    exit 1
fi

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

PAYLOAD=$(printf '%s\n' "$@" | jq -R . | jq -s '{issues: .}')

response=$(curl -s -w '\n%{http_code}' -X POST \
    -u "$AUTH" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$BASE_URL/rest/agile/1.0/board/$BOARD_ID/issue")

HTTP_CODE=$(echo "$response" | tail -1)
BODY=$(echo "$response" | sed '$d')

# A successful move returns 204 with an empty body. Anything else is a failure,
# including the 200-with-errors shape Jira uses for partial rejections, so the
# status code is checked before the body rather than instead of it.
if [[ "$HTTP_CODE" != "204" ]]; then
    echo "Error moving tickets to board $BOARD_ID (HTTP $HTTP_CODE):"
    if echo "$BODY" | jq -e '.errorMessages // .errors' > /dev/null 2>&1; then
        echo "$BODY" | jq -r '(.errorMessages // [])[], ((.errors // {}) | to_entries[] | "\(.key): \(.value)")'
    else
        echo "$BODY"
    fi
    exit 1
fi

for key in "$@"; do
    echo "$key -> board $BOARD_ID"
done
