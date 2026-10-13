#!/bin/bash
# Dispatcher for the theme-ticket skill.
#
# Usage: ./start-theme-ticket.sh "<trigger phrase>" --workarea <path under workareas/> [--theme <id>] [--mode NAME]
#
# Prints MODE: <NAME> as its first line, then a JSON payload with the paths the
# skill needs. The mode is the point in the theme's life:
#
#   STUB    the theme has just been split off — raise its ticket for the branch name
#   START   the build loop is starting on it — move its tickets to In Dev
#   WRITE   the loop has drained it — derive, split by domain, fill the tickets in
#   MERGE   it has merged to main — regenerate links against main, move to Deskcheck
#   STALE   report which of a workarea's tickets openspec has moved on from
#
# An automated caller should pass --mode rather than rely on the trigger phrase.
#
# Examples:
#   ./start-theme-ticket.sh "" --workarea shared/design-release-2-1 --theme origin-page --mode WRITE
#   ./start-theme-ticket.sh "which theme tickets are stale" --workarea shared/design-release-2-1

set -euo pipefail

WS="$HOME/git/defra/trade-imports-workspace"

TRIGGER="${1:-}"
shift || true

WORKAREA=""
THEME=""
MODE_ARG=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --workarea) WORKAREA="$2"; shift 2 ;;
        --theme) THEME="$2"; shift 2 ;;
        --mode) MODE_ARG="$(echo "$2" | tr '[:lower:]' '[:upper:]')"; shift 2 ;;
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

# Which point in the theme's life this is. An automated caller should pass
# --mode rather than rely on phrasing.
if [[ -n "$MODE_ARG" ]]; then
    MODE="$MODE_ARG"
    case "$MODE" in
        STUB|START|WRITE|MERGE|STALE) ;;
        *) echo "start-theme-ticket: unknown --mode $MODE (STUB, START, WRITE, MERGE, STALE)" >&2; exit 2 ;;
    esac
else
    MODE="WRITE"
    case "$(echo "$TRIGGER" | tr '[:upper:]' '[:lower:]')" in
        *stale*|*out\ of\ date*) MODE="STALE" ;;
        *stub*|*split*off*) MODE="STUB" ;;
        *merge*) MODE="MERGE" ;;
        *loop\ is\ starting*|*build\ is\ starting*|*starting\ on*) MODE="START" ;;
    esac
fi

if [[ "$MODE" != "STALE" && -z "$THEME" ]]; then
    echo "start-theme-ticket: --theme is required for mode $MODE" >&2
    echo "Themes in this workarea:" >&2
    if [[ -d "$WORKAREA_DIR/themes" ]]; then
        find "$WORKAREA_DIR/themes" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort >&2
    fi
    exit 2
fi

echo "MODE: $MODE"

# Existing ticket folders and the Jira key each one produced, so the skill knows
# which domains already have a ticket and which need creating.
EXISTING_LINES=""
for DIR in "$TICKETS_DIR"/*/; do
    [[ -d "$DIR" ]] || continue
    FOLDER_NAME="$(basename "$DIR")"
    FOLDER_KEY=""
    if [[ -f "$DIR/ticket.created.json" ]]; then
        FOLDER_KEY="$(jq -r '.key // empty' "$DIR/ticket.created.json")"
    fi
    EXISTING_LINES+="$(jq -n --arg folder "$FOLDER_NAME" --arg key "$FOLDER_KEY" '{folder: $folder, key: $key}')"$'\n'
done
EXISTING="$(printf '%s' "$EXISTING_LINES" | jq -s '.')"

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
