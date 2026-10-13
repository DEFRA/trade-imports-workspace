#!/bin/bash
# Report which of a workarea's theme tickets openspec has moved on from.
#
# Usage: ./check-stale.sh --workarea <path under workareas/> [--branch <name>]
#
# For each ticket folder, takes the spec files its description links to, finds
# when each was last changed on the branch, and compares that against when the
# Jira ticket was last updated. A spec newer than the ticket means the ticket is
# describing behaviour that has since changed.
#
# Reports only. Regenerating is a decision for the person reading this.
#
# Example:
#   ./check-stale.sh --workarea shared/design-release-2-1

set -euo pipefail

WS="$HOME/git/defra/trade-imports-workspace"

WORKAREA=""
BRANCH=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --workarea) WORKAREA="$2"; shift 2 ;;
        --branch) BRANCH="$2"; shift 2 ;;
        -h|--help) grep '^#' "${BASH_SOURCE[0]}" | cut -c3-; exit 0 ;;
        *) echo "unknown argument: $1" >&2; exit 2 ;;
    esac
done

if [[ -z "$WORKAREA" ]]; then
    echo "check-stale: --workarea is required" >&2
    exit 2
fi

TICKETS_DIR="$WS/workareas/$WORKAREA/tickets"
if [[ ! -d "$TICKETS_DIR" ]]; then
    echo "check-stale: no tickets folder at $TICKETS_DIR" >&2
    exit 1
fi

[[ -z "$BRANCH" ]] && BRANCH="$(git -C "$WS" rev-parse --abbrev-ref HEAD)"

STALE=0
CHECKED=0

printf '%-22s %-12s %-22s %-22s %s\n' FOLDER TICKET "SPEC LAST CHANGED" "TICKET UPDATED" VERDICT

for FOLDER in "$TICKETS_DIR"/*/; do
    [[ -d "$FOLDER" ]] || continue
    NAME="$(basename "$FOLDER")"
    DESCRIPTION="$FOLDER/description.txt"
    CREATED="$FOLDER/ticket.created.json"

    [[ -f "$DESCRIPTION" ]] || continue

    KEY=""
    [[ -f "$CREATED" ]] && KEY="$(jq -r '.key // empty' "$CREATED")"
    if [[ -z "$KEY" ]]; then
        printf '%-22s %-12s %-22s %-22s %s\n' "$NAME" "-" "-" "-" "no key recorded"
        continue
    fi

    # The spec files this ticket cites, taken from the links in its description.
    SPECS="$(grep -oE 'openspec/specs/[A-Za-z0-9/_-]+spec\.md' "$DESCRIPTION" | sort -u || true)"
    if [[ -z "$SPECS" ]]; then
        printf '%-22s %-12s %-22s %-22s %s\n' "$NAME" "$KEY" "-" "-" "cites no spec files"
        continue
    fi

    SPEC_LAST="$(git -C "$WS" log -1 --format=%cI "$BRANCH" -- $SPECS 2>/dev/null || true)"
    TICKET_UPDATED="$("$WS/tools/jira/search.sh" "key = $KEY" json --fields updated 2>/dev/null | jq -r '.issues[0].fields.updated // empty' || true)"

    CHECKED=$((CHECKED + 1))

    if [[ -z "$SPEC_LAST" || -z "$TICKET_UPDATED" ]]; then
        printf '%-22s %-12s %-22s %-22s %s\n' "$NAME" "$KEY" "${SPEC_LAST:--}" "${TICKET_UPDATED:--}" "cannot compare"
        continue
    fi

    SPEC_EPOCH="$(date -j -f '%Y-%m-%dT%H:%M:%S' "${SPEC_LAST:0:19}" +%s 2>/dev/null || echo 0)"
    TICKET_EPOCH="$(date -j -f '%Y-%m-%dT%H:%M:%S' "${TICKET_UPDATED:0:19}" +%s 2>/dev/null || echo 0)"

    if [[ "$SPEC_EPOCH" -gt "$TICKET_EPOCH" ]]; then
        STALE=$((STALE + 1))
        VERDICT="STALE — regenerate"
    else
        VERDICT="current"
    fi

    printf '%-22s %-12s %-22s %-22s %s\n' "$NAME" "$KEY" "${SPEC_LAST:0:19}" "${TICKET_UPDATED:0:19}" "$VERDICT"
done

echo
echo "$CHECKED ticket(s) compared, $STALE stale."
if [[ "$STALE" -gt 0 ]]; then
    echo "Regenerate a stale ticket by re-deriving its theme and rewriting its description.txt."
fi
