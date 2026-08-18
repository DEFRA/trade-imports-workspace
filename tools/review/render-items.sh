#!/bin/bash
# Render the `## Items` markdown table for one repo from items.{repo}.json.
# Usage: render-items.sh EUDPA-XXXXX --repo REPO
#
# Stdout is the table only (header + separator + rows). Pipes inside
# cell values are escaped as `\|` so the table stays well-formed.

set -e

TICKET=""
REPO=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO="$2"; shift 2 ;;
        -*) echo "Unknown option: $1" >&2; exit 1 ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && { echo "Usage: $0 EUDPA-XXXXX --repo REPO" >&2; exit 1; }
[[ -z "$REPO"   ]] && { echo "--repo required" >&2; exit 1; }

target="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/items.${REPO}.json"
[[ -f "$target" ]] || { echo "Items file not found: $target" >&2; exit 1; }

echo "| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |"
echo "|---|------|------|----------|----------|-------|-----|-------------|--------|-------|"
jq -r '
    def esc: . | tostring | gsub("\\|"; "\\|");
    .items[] |
    "| \(.id) | \(.file | esc) | \(.line // "" | esc) | \(.severity // "") | \(.category // "" | esc) | \(.issue // "" | esc) | \(.fix // "" | esc) | \(.disposition // "") | \(.status // "") | \(.notes // "" | esc) |"
' "$target"
