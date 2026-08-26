#!/bin/bash
# Delete an attachment from a JIRA ticket
# Usage: ./delete-attachment.sh EUDPA-XXXXX FILENAME
#        ./delete-attachment.sh EUDPA-XXXXX FILENAME --all
#        ./delete-attachment.sh --id 479899
#        ./delete-attachment.sh EUDPA-XXXXX --list
#
# Options:
#   --list        List the ticket's attachments and exit
#   --all         Delete every attachment matching FILENAME
#   --id ID       Delete one attachment by its numeric id
#   -h, --help    Show this help message
#
# Jira allows several attachments to share a filename: attaching a name that
# already exists adds a SECOND file rather than replacing the first, and the
# description renders whichever it resolves first. So regenerating an attached
# diagram is delete-then-attach, and this script is the delete half.
#
# Deleting by FILENAME refuses to act when more than one matches, listing the
# candidates instead — the ambiguous case is exactly the mess this tool exists
# to clear up, so it must not guess which copy you meant.

set -e

show_help() {
    cat << EOF
Delete an attachment from a JIRA ticket

Usage: ./delete-attachment.sh EUDPA-XXXXX FILENAME
       ./delete-attachment.sh EUDPA-XXXXX FILENAME --all
       ./delete-attachment.sh --id 479899
       ./delete-attachment.sh EUDPA-XXXXX --list

Options:
  --list        List the ticket's attachments and exit
  --all         Delete every attachment matching FILENAME
  --id ID       Delete one attachment by its numeric id
  -h, --help    Show this help message

Environment Variables:
  JIRA_USER      Your Atlassian email address
  JIRA_TOKEN     Your Atlassian API token
  JIRA_BASE_URL  e.g. https://eaflood.atlassian.net

Examples:
  ./delete-attachment.sh EUDPA-333 --list
  ./delete-attachment.sh EUDPA-333 happy-path.svg
  ./delete-attachment.sh EUDPA-333 happy-path.svg --all
  ./delete-attachment.sh --id 479899
EOF
    exit 0
}

TICKET=""
FILENAME=""
BY_ID=""
LIST_ONLY=false
DELETE_ALL=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) show_help ;;
        --list) LIST_ONLY=true; shift ;;
        --all) DELETE_ALL=true; shift ;;
        --id) BY_ID="${2:?--id needs an attachment id}"; shift 2 ;;
        -*) echo "Error: unknown option: $1" >&2; exit 1 ;;
        *)
            if [[ -z "$TICKET" ]]; then TICKET="$1"
            elif [[ -z "$FILENAME" ]]; then FILENAME="$1"
            else echo "Error: unexpected argument: $1" >&2; exit 1
            fi
            shift
            ;;
    esac
done

USER="${JIRA_USER:?JIRA_USER is not set}"
TOKEN="${JIRA_TOKEN:?JIRA_TOKEN is not set}"
BASE_URL="${JIRA_BASE_URL:?JIRA_BASE_URL is not set}"

delete_one() {
    local id="$1" name="$2"
    local status
    status=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE \
        -u "$USER:$TOKEN" \
        "$BASE_URL/rest/api/2/attachment/$id")

    case "$status" in
        204) echo "Deleted: ${name:-attachment} (id $id)" ;;
        403) echo "Error: not permitted to delete attachment $id" >&2; exit 1 ;;
        404) echo "Error: no attachment with id $id" >&2; exit 1 ;;
        *)   echo "Error: delete failed with HTTP $status" >&2; exit 1 ;;
    esac
}

if [[ -n "$BY_ID" ]]; then
    delete_one "$BY_ID" ""
    exit 0
fi

if [[ -z "$TICKET" ]]; then
    echo "Error: give a ticket key, or --id ID" >&2
    exit 1
fi

attachments=$(curl -s -u "$USER:$TOKEN" \
    -H "Content-Type: application/json" \
    "$BASE_URL/rest/api/2/issue/$TICKET?fields=attachment")

if ! echo "$attachments" | jq -e '.fields.attachment' >/dev/null 2>&1; then
    echo "Error: could not read attachments for $TICKET" >&2
    echo "$attachments" | jq -r '.errorMessages[]? // .' >&2
    exit 1
fi

if [[ "$LIST_ONLY" == true ]]; then
    count=$(echo "$attachments" | jq '.fields.attachment | length')
    if [[ "$count" == "0" ]]; then
        echo "$TICKET has no attachments"
        exit 0
    fi
    echo "$attachments" | jq -r \
        '.fields.attachment[] | "\(.id)\t\(.filename)\t\(.size) bytes\t\(.created)"'
    exit 0
fi

if [[ -z "$FILENAME" ]]; then
    echo "Error: give a FILENAME to delete, or --list to see what is there" >&2
    exit 1
fi

matches=$(echo "$attachments" | jq -c --arg f "$FILENAME" \
    '[.fields.attachment[] | select(.filename == $f)]')
count=$(echo "$matches" | jq 'length')

if [[ "$count" == "0" ]]; then
    echo "Error: $TICKET has no attachment named $FILENAME" >&2
    echo "Run with --list to see what is there." >&2
    exit 1
fi

if [[ "$count" -gt 1 && "$DELETE_ALL" != true ]]; then
    echo "Error: $count attachments on $TICKET are named $FILENAME:" >&2
    echo "$matches" | jq -r '.[] | "  id \(.id)\t\(.size) bytes\tcreated \(.created)"' >&2
    echo "Delete one with --id ID, or all of them with --all." >&2
    exit 1
fi

echo "$matches" | jq -r '.[] | "\(.id)\t\(.filename)"' | while IFS=$'\t' read -r id name; do
    delete_one "$id" "$name"
done

echo "URL: $BASE_URL/browse/$TICKET"
