#!/bin/bash
# Post a ticket folder's description, and its summary, to Jira.
#
# Usage: ./push-description.sh <ticket folder> [--key EUDPA-N] [--dry-run]
#
# The folder holds description.txt (the Jira description field, verbatim) and
# ticket.json (a tim-ticket/1 manifest, whose summary is posted with it so the
# two can never drift). The Jira key comes from ticket.created.json, or from
# --key for a ticket that was raised before this skill existed.
#
# Summary and description go in one request: posting them separately leaves a
# window where the ticket reads as one change and is titled as another.
#
# Examples:
#   ./push-description.sh ~/git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/tickets/animals-journey
#   ./push-description.sh <folder> --dry-run

set -euo pipefail

WS="$HOME/git/defra/trade-imports-workspace"

FOLDER="${1:-}"
shift || true

KEY=""
DRY_RUN=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --key) KEY="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        -h|--help) grep '^#' "${BASH_SOURCE[0]}" | cut -c3-; exit 0 ;;
        *) echo "unknown argument: $1" >&2; exit 2 ;;
    esac
done

if [[ -z "$FOLDER" || ! -d "$FOLDER" ]]; then
    echo "push-description: give a ticket folder" >&2
    exit 2
fi

DESCRIPTION="$FOLDER/description.txt"
MANIFEST="$FOLDER/ticket.json"
CREATED="$FOLDER/ticket.created.json"

if [[ ! -f "$DESCRIPTION" ]]; then
    echo "push-description: no description.txt in $FOLDER" >&2
    exit 1
fi

if [[ -z "$KEY" && -f "$CREATED" ]]; then
    KEY="$(jq -r '.key // empty' "$CREATED")"
fi

if [[ -z "$KEY" ]]; then
    echo "push-description: no Jira key. Pass --key, or create the ticket first with:" >&2
    echo "  tim jira create --from $MANIFEST" >&2
    exit 1
fi

SUMMARY=""
if [[ -f "$MANIFEST" ]]; then
    SUMMARY="$(jq -r '.summary // empty' "$MANIFEST")"
fi

# The description must be wiki markup, not Markdown: Jira Cloud renders it
# through rest/api/2, where a single newline is a line break. A hard-wrapped
# paragraph comes out as ragged mid-sentence lines, so refuse one.
if grep -qE '^[A-Za-z(“"].{0,78}$' "$DESCRIPTION" && grep -qE '^h[0-9]\.' "$DESCRIPTION"; then
    WRAPPED="$(
        awk 'prev != "" && $0 != "" && prev !~ /^(h[0-9]\.|\*|\|)/ && $0 !~ /^(h[0-9]\.|\*|\|)/ { print NR } { prev = $0 }' "$DESCRIPTION" | head -3
    )"
    if [[ -n "$WRAPPED" ]]; then
        echo "push-description: $DESCRIPTION looks hard-wrapped at these lines: $(echo "$WRAPPED" | tr '\n' ' ')" >&2
        echo "Jira treats a single newline as a line break. Put each paragraph on one line." >&2
        exit 1
    fi
fi

if grep -q '{expand' "$DESCRIPTION"; then
    echo "push-description: $DESCRIPTION uses {expand}. Jira Cloud renders wiki markup through" >&2
    echo "rest/api/2, which drops macros — it would appear as literal text. Remove it." >&2
    exit 1
fi

echo "Ticket:      $KEY"
echo "Description: $DESCRIPTION ($(wc -l < "$DESCRIPTION" | tr -d ' ') lines)"
[[ -n "$SUMMARY" ]] && echo "Summary:     $SUMMARY"

if [[ "$DRY_RUN" == "1" ]]; then
    echo
    echo "Dry run. Nothing sent."
    exit 0
fi

if [[ -n "$SUMMARY" ]]; then
    "$WS/tools/jira/update-ticket.sh" "$KEY" -s "$SUMMARY" -d - < "$DESCRIPTION"
else
    "$WS/tools/jira/update-ticket.sh" "$KEY" -d - < "$DESCRIPTION"
fi
