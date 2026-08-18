#!/bin/bash
# Mark per-repo analysis complete and stamp changeSummary + whyItChanged.
#
# Usage:
#   analysis-set-verdict.sh EUDPA-XXXXX --repo R \
#       --change-summary "..." --why-it-changed "..."

set -e

TICKET=""; REPO=""; SUMMARY=""; WHY=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --repo) REPO="$2"; shift 2 ;;
        --change-summary) SUMMARY="$2"; shift 2 ;;
        --why-it-changed) WHY="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in TICKET REPO SUMMARY WHY; do
    [[ -z "${!v}" ]] && { echo "Error: missing required arg $v" >&2; exit 1; }
done

# Length caps per assets/analysis-schema.md
if [[ ${#SUMMARY} -gt 300 ]]; then
    echo "Error: --change-summary exceeds 300 chars (got ${#SUMMARY})" >&2
    exit 1
fi
if [[ ${#WHY} -gt 300 ]]; then
    echo "Error: --why-it-changed exceeds 300 chars (got ${#WHY})" >&2
    exit 1
fi

target="$HOME/git/defra/trade-imports-workspace/workareas/understanding-checks/$TICKET/analysis.$REPO.json"
[[ -f "$target" ]] || { echo "Error: $target not found" >&2; exit 1; }

completed_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq \
    --arg summary "$SUMMARY" \
    --arg why "$WHY" \
    --arg completed_at "$completed_at" \
    '.changeSummary = $summary
     | .whyItChanged = $why
     | .verdict = "complete"
     | .completed_at = $completed_at' \
    "$target" > "$target.tmp"
mv "$target.tmp" "$target"

echo "Marked $REPO analysis complete."
