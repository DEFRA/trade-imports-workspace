#!/bin/bash
# Render the `## Items` markdown table for one repo from items.{repo}.json.
# Usage: render-items.sh EUDPA-XXXXX --repo REPO
#
#
# Stdout is the table only (header + separator + rows). A fix's "Must:"
# and "One way:" parts get a column each; a fix with no labels is all
# Must. Pipes inside cell values are escaped as `\|`.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

jq -r -f "$SCRIPT_DIR/items-table.jq" "$target"
