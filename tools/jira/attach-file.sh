#!/bin/bash
# Attach a file to a JIRA issue.
# Usage: ./attach-file.sh TICKET-KEY FILE
#
# Environment:
#   JIRA_USER      Atlassian email address
#   JIRA_TOKEN     Atlassian API token
#   JIRA_BASE_URL  e.g. https://eaflood.atlassian.net
#
# Attaching a file with a name that already exists on the issue creates a
# SECOND attachment rather than replacing the first, and Jira wiki markup
# then renders whichever it resolves first. Delete the old one before
# re-attaching a regenerated diagram.

set -e

TICKET="${1:?Usage: attach-file.sh TICKET-KEY FILE}"
FILE="${2:?Usage: attach-file.sh TICKET-KEY FILE}"

if [[ ! -f "$FILE" ]]; then
    echo "Error: no such file: $FILE" >&2
    exit 1
fi

USER="${JIRA_USER:?JIRA_USER is not set}"
TOKEN="${JIRA_TOKEN:?JIRA_TOKEN is not set}"
BASE_URL="${JIRA_BASE_URL:?JIRA_BASE_URL is not set}"

response=$(curl -s -w '\n%{http_code}' -X POST \
    -u "$USER:$TOKEN" \
    -H "X-Atlassian-Token: no-check" \
    -F "file=@${FILE}" \
    "$BASE_URL/rest/api/2/issue/$TICKET/attachments")

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [[ "$status" != "200" ]]; then
    echo "Error: attach failed with HTTP $status" >&2
    echo "$body" >&2
    exit 1
fi

echo "$body" | jq -r '.[] | "Attached: \(.filename) (\(.size) bytes, id \(.id))"'
echo "URL: $BASE_URL/browse/$TICKET"
