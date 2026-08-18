#!/bin/bash
# Stamp the final verdict onto .refinement-meta.json after review.md is filled.
# Usage: ./refine-finalize.sh EUDPA-XXXXX --verdict V [--reason "..."]
#
# Validates V against the enum {READY, NEEDS WORK, SPIKE REQUIRED}.
# Atomic write (jq → tmp → mv). Schema: assets/refinement-schema.md.

set -e

TICKET=""
VERDICT=""
REASON=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --verdict)
            VERDICT="$2"
            shift 2
            ;;
        --reason)
            REASON="$2"
            shift 2
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            TICKET="$1"
            shift
            ;;
    esac
done

if [[ -z "$TICKET" ]] || [[ -z "$VERDICT" ]]; then
    echo "Usage: ./refine-finalize.sh EUDPA-XXXXX --verdict V [--reason \"...\"]"
    echo "  V must be one of: READY, NEEDS WORK, SPIKE REQUIRED"
    exit 1
fi

case "$VERDICT" in
    READY|"NEEDS WORK"|"SPIKE REQUIRED")
        ;;
    *)
        echo "Error: --verdict must be one of: READY, NEEDS WORK, SPIKE REQUIRED" >&2
        echo "Got: '$VERDICT'" >&2
        exit 1
        ;;
esac

REFINE_DIR="$HOME/git/defra/trade-imports-workspace/workareas/ticket-refinement/$TICKET"
META="$REFINE_DIR/.refinement-meta.json"

if [[ ! -f "$META" ]]; then
    echo "Error: $META not found — run prepare-refinement.sh $TICKET first" >&2
    exit 1
fi

command -v jq >/dev/null 2>&1 || { echo "Error: jq is required" >&2; exit 1; }

completed_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
tmp=$(mktemp)

jq \
    --arg verdict "$VERDICT" \
    --arg reason "$REASON" \
    --arg completed_at "$completed_at" \
    '.verdict = $verdict
     | .verdict_reason = (if $reason == "" then null else $reason end)
     | .completed_at = $completed_at' \
    "$META" > "$tmp"

mv "$tmp" "$META"

echo "Verdict recorded for $TICKET: $VERDICT"
if [[ -n "$REASON" ]]; then
    echo "Reason: $REASON"
fi
echo "Meta: $META"
