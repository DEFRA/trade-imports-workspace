#!/bin/bash
# Set verdict + reason on a per-file review JSON. Stamps reviewed_at.
# Usage: file-review-set-verdict.sh EUDPA-X --repo R --file F --verdict V [--reason "..."]

set -e

TICKET=""; REPO=""; FILE=""; VERDICT=""; REASON=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        EUDPA-*) TICKET="$1"; shift ;;
        --repo) REPO="$2"; shift 2 ;;
        --file) FILE="$2"; shift 2 ;;
        --verdict) VERDICT="$2"; shift 2 ;;
        --reason) REASON="$2"; shift 2 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

for v in TICKET REPO FILE VERDICT; do
    [[ -z "${!v}" ]] && { echo "Missing $v" >&2; exit 1; }
done

case "$VERDICT" in
    SAFE|NEEDS_ATTENTION|RISKY) ;;
    *) echo "Invalid verdict: $VERDICT (must be SAFE|NEEDS_ATTENTION|RISKY)" >&2; exit 1 ;;
esac

encoded="${FILE//\//_}"
target="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/file-reviews/$REPO/$encoded.review.json"
[[ -f "$target" ]] || { echo "No review file at $target — call file-review-init.sh first" >&2; exit 1; }

now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq \
    --arg verdict "$VERDICT" \
    --arg reason "$REASON" \
    --arg now "$now" \
    '.verdict = $verdict | .verdict_reason = $reason | .reviewed_at = $now' \
    "$target" > "$target.tmp" && mv "$target.tmp" "$target"
