#!/bin/bash
# Pre-fetch present-info context for the ticket-creator skill:
#   - active epics on the EUDPA board (default board 13780)
#   - capability codes from the EUDP Import Notification Capability Map
#     (default Confluence page 6468764101)
#
# Outputs live under workareas/ticket-creation/.prereqs/. The skill
# Reads them at session start so the interview can offer concrete
# pickers ("which epic?" / "which capability?") backed by fresh data.
#
# Usage: ./prepare-ticket-creation.sh [--board BOARD_ID] [--cap-page PAGE_ID]
#
# Environment:
#   JIRA_USER, JIRA_TOKEN, JIRA_BASE_URL  (Atlassian credentials)

set -euo pipefail

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
BOARD_ID="13780"
CAP_PAGE_ID="6468764101"
MIN_CAPABILITIES="${MIN_CAPABILITIES:-20}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --board)
            BOARD_ID="$2"; shift 2
            ;;
        --cap-page)
            CAP_PAGE_ID="$2"; shift 2
            ;;
        -h|--help)
            sed -n '2,16p' "$0"; exit 0
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

OUTPUT_DIR="$WORKSPACE/workareas/ticket-creation/.prereqs"
SYNCED_MD="$WORKSPACE/docs/confluence/import-notification-capability-map.md"

mkdir -p "$OUTPUT_DIR"

# ── 1. Active epics from the board ─────────────────────────────────────────────

EPICS_FILE="$OUTPUT_DIR/epics.txt"
"$WORKSPACE/tools/jira/list-board-epics.sh" "$BOARD_ID" > "$EPICS_FILE"
EPIC_COUNT=$(wc -l < "$EPICS_FILE" | tr -d ' ')

# ── 2. Capability codes from the synced capability map ────────────────────────

CAPS_FILE="$OUTPUT_DIR/capabilities.txt"
STALE_WARNING=""
PARSE_ERROR=""

if [[ ! -f "$SYNCED_MD" ]]; then
    STALE_WARNING="No synced capability map found at $SYNCED_MD — run tools/confluence/sync-docs.sh to populate docs/confluence/."
    : > "$CAPS_FILE"
else
    # Compare Confluence live version against the synced frontmatter. This
    # catches sync drift; it cannot catch a broken parse, which is what the
    # strict extractor below is for.
    LIVE_VERSION=$("$WORKSPACE/tools/confluence/page.sh" "$CAP_PAGE_ID" summary 2>/dev/null | jq -r '.version // empty' || true)
    SYNCED_VERSION=$(grep -m1 '^version:' "$SYNCED_MD" | awk '{print $2}' || true)

    if [[ -n "$LIVE_VERSION" && -n "$SYNCED_VERSION" && "$LIVE_VERSION" != "$SYNCED_VERSION" ]]; then
        STALE_WARNING="Synced capability map is at version $SYNCED_VERSION; live page is at version $LIVE_VERSION. Re-run tools/confluence/sync-docs.sh to refresh."
    fi

    # Fail closed. A partial list is the exact bug this script had for months —
    # the skill cannot tell a short list from a complete one, so emit all of
    # it or none of it and say why.
    CAPS_TMP=$(mktemp)
    if "$WORKSPACE/tools/ticket-creator/extract-capabilities.sh" "$SYNCED_MD" --format list 2>"$CAPS_TMP.err" | sort -u > "$CAPS_TMP"; then
        mv "$CAPS_TMP" "$CAPS_FILE"
    else
        PARSE_ERROR="Capability map is not canonical — see tools/ticket-creator/check-capabilities.sh. capabilities.txt left unchanged."
        cat "$CAPS_TMP.err" >&2
        rm -f "$CAPS_TMP"
    fi
    rm -f "$CAPS_TMP.err"
fi

CAP_COUNT=0
[[ -f "$CAPS_FILE" ]] && CAP_COUNT=$(wc -l < "$CAPS_FILE" | tr -d ' ')

# Floor check. The strict extractor already rejects any row it cannot parse,
# so this only guards the case where the table shape changes so far that no
# row anchors at all and the extractor exits clean with nothing to say.
if [[ -z "$PARSE_ERROR" && "$CAP_COUNT" -lt "$MIN_CAPABILITIES" ]]; then
    PARSE_ERROR="Only $CAP_COUNT capabilities extracted, below the floor of $MIN_CAPABILITIES. The capability tables have probably changed shape."
fi

# ── 3. Meta ────────────────────────────────────────────────────────────────────

# Spell every key out. Under `jq -n` the {board} shorthand means
# {board: .board} against null input, not {board: $board} — which is why
# this file was all nulls.
jq -n \
    --arg board "$BOARD_ID" \
    --arg cap_page "$CAP_PAGE_ID" \
    --arg generated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson epic_count "$EPIC_COUNT" \
    --argjson cap_count "$CAP_COUNT" \
    --arg stale_warning "$STALE_WARNING" \
    --arg parse_error "$PARSE_ERROR" \
    '{
        board: $board,
        cap_page: $cap_page,
        generated: $generated,
        epic_count: $epic_count,
        cap_count: $cap_count,
        stale_warning: $stale_warning,
        parse_error: $parse_error
    }' \
    > "$OUTPUT_DIR/meta.json"

# ── 4. Summary ─────────────────────────────────────────────────────────────────

echo "Prepared ticket-creation prereqs at $OUTPUT_DIR/"
echo "  - epics.txt          ($EPIC_COUNT active epics from board $BOARD_ID)"
if [[ -n "$PARSE_ERROR" ]]; then
    echo "  - capabilities.txt   NOT REFRESHED — still holds $CAP_COUNT codes from a previous run"
else
    echo "  - capabilities.txt   ($CAP_COUNT capability codes from page $CAP_PAGE_ID)"
fi
echo "  - meta.json"
if [[ -n "$STALE_WARNING" ]]; then
    echo
    echo "  WARNING: $STALE_WARNING"
fi
if [[ -n "$PARSE_ERROR" ]]; then
    echo
    echo "  ERROR: $PARSE_ERROR"
    exit 1
fi
