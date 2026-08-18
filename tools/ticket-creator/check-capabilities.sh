#!/bin/bash
# Migration loop for the EUDP Import Notification Capability Map.
#
# Re-run this after each Confluence edit to see which capability rows are
# canonical and which still need work. Read-only — writes nothing.
#
# Diagnostic rather than strict: while the migration is in flight most rows
# are legitimately non-canonical, so this reports rather than refuses. It
# exits non-zero while any violation remains, so it also serves as the gate
# before wiring the strict parser in.
#
# Refreshes the local copy of the map from Confluence first, so the report
# always describes the page as it is now rather than as it was last synced.
#
# Usage: ./check-capabilities.sh [--cap-page PAGE_ID] [--no-sync] [--quiet]
#
# Options:
#   --cap-page PAGE_ID  Confluence page to refresh and check (default 6468764101)
#   --no-sync           Report on the local copy as-is, without refreshing
#   --quiet             Summary only; skip the per-row table
#
# Environment:
#   JIRA_USER, JIRA_TOKEN, JIRA_BASE_URL

set -euo pipefail

WORKSPACE="$HOME/git/defra/trade-imports-workspace"
CAP_PAGE_ID="6468764101"
QUIET=false
SYNC=true

while [[ $# -gt 0 ]]; do
    case "$1" in
        --cap-page) CAP_PAGE_ID="${2:?--cap-page requires a value}"; shift 2 ;;
        --no-sync)  SYNC=false; shift ;;
        --quiet)    QUIET=true; shift ;;
        -h|--help)  sed -n '2,26p' "$0"; exit 0 ;;
        *)          echo "Unknown argument: $1" >&2; exit 1 ;;
    esac
done

SYNCED_MD="$WORKSPACE/docs/confluence/import-notification-capability-map.md"
EXTRACTOR="$WORKSPACE/tools/ticket-creator/extract-capabilities.sh"

# Statuses the map's own "Guide to reading this document" defines.
KNOWN_STATUSES="NOT STARTED|IN PROGRESS|SKELETON|COMPLETE|POST DAY ONE"

if [[ ! -f "$SYNCED_MD" ]]; then
    echo "No synced capability map at $SYNCED_MD" >&2
    echo "Run tools/confluence/sync-docs.sh first." >&2
    exit 1
fi

# ── 1. Refresh the local copy ─────────────────────────────────────────────────

BEFORE_VERSION=$(grep -m1 '^version:' "$SYNCED_MD" | awk '{print $2}' || true)

if [[ "$SYNC" == "true" ]]; then
    if ! "$WORKSPACE/tools/confluence/sync-docs.sh" --page-id "$CAP_PAGE_ID" >/dev/null 2>&1; then
        echo "⚠ Could not refresh from Confluence — reporting on the local copy," >&2
        echo "  which may not include your latest edit." >&2
        echo >&2
    fi
fi

SYNCED_VERSION=$(grep -m1 '^version:' "$SYNCED_MD" | awk '{print $2}' || true)

echo "Capability map"
echo "  version : ${SYNCED_VERSION:-unknown}"
if [[ "$SYNC" == "true" && -n "$BEFORE_VERSION" && "$BEFORE_VERSION" != "$SYNCED_VERSION" ]]; then
    echo "            (refreshed from $BEFORE_VERSION)"
elif [[ "$SYNC" != "true" ]]; then
    echo "            (--no-sync: local copy, not refreshed)"
fi
echo

# ── 2. Parse ──────────────────────────────────────────────────────────────────

ROWS=$("$EXTRACTOR" "$SYNCED_MD" --format tsv)

if [[ -z "$ROWS" ]]; then
    echo "No capability rows found at all — the table shape has changed." >&2
    exit 1
fi

TOTAL=$(printf '%s\n' "$ROWS" | wc -l | tr -d ' ')
OK=$(printf '%s\n' "$ROWS" | awk -F'\t' '$4 == "ok"' | wc -l | tr -d ' ')

# ── 3. Per-row table ──────────────────────────────────────────────────────────

if [[ "$QUIET" != "true" ]]; then
    printf '%-18s %-14s %-42s %s\n' "CODE" "STATUS" "NAME" "VERDICT"
    printf '%-18s %-14s %-42s %s\n' "------------------" "--------------" \
        "------------------------------------------" "-------"
    printf '%s\n' "$ROWS" | awk -F'\t' '{
        name = length($3) > 42 ? substr($3, 1, 39) "..." : $3
        printf "%-18s %-14s %-42s %s\n", $1, ($2 == "" ? "-" : $2), name, $4
    }'
    echo
fi

# ── 4. Violations grouped by rule ─────────────────────────────────────────────

VIOLATIONS=$(printf '%s\n' "$ROWS" | awk -F'\t' '$4 != "ok"')

if [[ -n "$VIOLATIONS" ]]; then
    echo "Outstanding work"
    printf '%s\n' "$VIOLATIONS" \
        | awk -F'\t' '{ n = split($4, rules, ","); for (i = 1; i <= n; i++) print rules[i] "\t" $1 }' \
        | sort \
        | awk -F'\t' '
            { codes[$1] = codes[$1] (codes[$1] == "" ? "" : ", ") $2; count[$1]++ }
            END { for (r in count) printf "  %-24s %2d  %s\n", r, count[r], codes[r] }' \
        | sort
    echo
fi

# ── 5. Unknown status values ──────────────────────────────────────────────────

UNKNOWN=$(printf '%s\n' "$ROWS" \
    | awk -F'\t' -v known="^($KNOWN_STATUSES)$" '$2 != "" && $2 !~ known { print "  " $1 "  " $2 }')

if [[ -n "$UNKNOWN" ]]; then
    echo "Status values outside the documented set"
    printf '%s\n' "$UNKNOWN"
    echo
fi

# ── 6. Summary ────────────────────────────────────────────────────────────────

echo "$OK of $TOTAL rows canonical"

if [[ "$OK" -eq "$TOTAL" ]]; then
    echo "Map is consistent — the strict parser will run clean."
    exit 0
fi

exit 1
