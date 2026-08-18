#!/bin/bash
# Set verdict + reason on a per-file style review JSON. Stamps reviewed_at.
# Usage: file-style-set-verdict.sh EUDPA-X --repo R --file F --verdict V [--reason "..."]

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
    COMPLIANT|MINOR_ISSUES|NEEDS_WORK) ;;
    *) echo "Invalid verdict: $VERDICT (must be COMPLIANT|MINOR_ISSUES|NEEDS_WORK)" >&2; exit 1 ;;
esac

encoded="${FILE//\//_}"
target="$HOME/git/defra/trade-imports-workspace/workareas/code-style-reviews/$TICKET/file-reviews/$REPO/$encoded.style.json"
[[ -f "$target" ]] || { echo "No style file at $target — call file-style-init.sh first" >&2; exit 1; }

now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq \
    --arg verdict "$VERDICT" \
    --arg reason "$REASON" \
    --arg now "$now" \
    '.verdict = $verdict | .verdict_reason = $reason | .reviewed_at = $now' \
    "$target" > "$target.tmp" && mv "$target.tmp" "$target"
