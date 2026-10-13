#!/bin/bash
# Dispatcher for the theme-ticket skill.
#
# Usage: ./start-theme-ticket.sh "<trigger phrase>" --workarea <path under workareas/> [--theme <id>]
#
# Prints MODE: WRITE or MODE: STALE as its first line, then a JSON payload with
# the paths the skill needs. WRITE derives a theme and writes its per-domain
# descriptions; STALE reports which of a workarea's tickets openspec has moved
# on from.
#
# Examples:
#   ./start-theme-ticket.sh "write the theme ticket" --workarea shared/design-release-2-1 --theme origin-page
#   ./start-theme-ticket.sh "which theme tickets are stale" --workarea shared/design-release-2-1

set -euo pipefail

WS="$HOME/git/defra/trade-imports-workspace"

TRIGGER="${1:-}"
shift || true

WORKAREA=""
THEME=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --workarea) WORKAREA="$2"; shift 2 ;;
        --theme) THEME="$2"; shift 2 ;;
        -h|--help) grep '^#' "${BASH_SOURCE[0]}" | cut -c3-; exit 0 ;;
        *) echo "unknown argument: $1" >&2; exit 2 ;;
    esac
done

if [[ -z "$WORKAREA" ]]; then
    echo "start-theme-ticket: --workarea is required (a path under workareas/, e.g. shared/design-release-2-1)" >&2
    exit 2
fi

WORKAREA_DIR="$WS/workareas/$WORKAREA"
if [[ ! -d "$WORKAREA_DIR" ]]; then
    echo "start-theme-ticket: no workarea at $WORKAREA_DIR" >&2
    exit 1
fi

TICKETS_DIR="$WORKAREA_DIR/tickets"
mkdir -p "$TICKETS_DIR"

BRANCH="$(git -C "$WS" rev-parse --abbrev-ref HEAD)"

# Which mode the trigger asks for. Anything mentioning staleness reports; every
# other trigger writes.
MODE="WRITE"
case "$(echo "$TRIGGER" | tr '[:upper:]' '[:lower:]')" in
    *stale*|*out\ of\ date*) MODE="STALE" ;;
esac

if [[ "$MODE" == "WRITE" && -z "$THEME" ]]; then
    echo "start-theme-ticket: --theme is required to write a theme's tickets" >&2
    echo "Themes in this workarea:" >&2
    if [[ -d "$WORKAREA_DIR/themes" ]]; then
        find "$WORKAREA_DIR/themes" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort >&2
    fi
    exit 2
fi

echo "MODE: $MODE"

# Existing ticket folders and the Jira key each one produced, so the skill knows
# which domains already have a ticket and which need creating.
EXISTING="$(
    find "$TICKETS_DIR" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null |
        xargs -0 -I{} sh -c 'd="{}"; k=""; [ -f "$d/ticket.created.json" ] && k=$(jq -r ".key // empty" "$d/ticket.created.json"); printf "{\"folder\":\"%s\",\"key\":\"%s\"}\n" "$(basename "$d")" "$k"' |
        jq -s '.'
)"

jq -n \
    --arg mode "$MODE" \
    --arg workarea "$WORKAREA" \
    --arg theme "$THEME" \
    --arg branch "$BRANCH" \
    --arg workareaDir "$WORKAREA_DIR" \
    --arg ticketsDir "$TICKETS_DIR" \
    --argjson existing "${EXISTING:-[]}" \
    '{
        mode: $mode,
        workarea: $workarea,
        theme: (if $theme == "" then null else $theme end),
        branch: $branch,
        workareaDir: $workareaDir,
        ticketsDir: $ticketsDir,
        existingTickets: $existing
    }'
