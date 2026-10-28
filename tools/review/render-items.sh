#!/bin/bash
# Render the `## Items` markdown table for one repo from items.{repo}.json.
# Usage: render-items.sh EUDPA-XXXXX --repo REPO [--write]
#
# Stdout is the table only (header + separator + rows). A fix's "Must:"
# and "One way:" parts get a column each; a fix with no labels is all
# Must. Pipes inside cell values are escaped as `\|`.
#
# --write puts the table into review.{repo}.md instead of printing it:
# it replaces the table already there, or, when there is none, goes in
# just before "## Repository Verdict" in place of the paste-here comment.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    cat <<'EOF'
Usage: render-items.sh EUDPA-XXXXX --repo REPO [--write]

Render the ## Items markdown table for one repo from items.{repo}.json.

Options:
  --repo REPO   The repo whose items to render (required)
  --write       Write the table into review.{repo}.md instead of printing it.
                Replaces the table already there; with none, puts it before
                "## Repository Verdict", in place of the paste-here comment.
  -h, --help    Show this help
EOF
}

TICKET=""
REPO=""
WRITE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --repo) REPO="$2"; shift 2 ;;
        --write) WRITE=true; shift ;;
        -h|--help) usage; exit 0 ;;
        -*) echo "Unknown option: $1" >&2; exit 1 ;;
        *) TICKET="$1"; shift ;;
    esac
done

[[ -z "$TICKET" ]] && { usage >&2; exit 1; }
[[ -z "$REPO"   ]] && { echo "--repo required" >&2; exit 1; }

review_dir="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET"
target="$review_dir/items.${REPO}.json"
[[ -f "$target" ]] || { echo "Items file not found: $target" >&2; exit 1; }

if [[ "$WRITE" == false ]]; then
    jq -r -f "$SCRIPT_DIR/items-table.jq" "$target"
    exit 0
fi

summary="$review_dir/review.${REPO}.md"
[[ -f "$summary" ]] || { echo "Review summary not found: $summary" >&2; exit 1; }

table=$(mktemp)
written=$(mktemp)
trap 'rm -f "$table" "$written"' EXIT

jq -r -f "$SCRIPT_DIR/items-table.jq" "$target" > "$table"

# The items table is the one whose header starts "| # | File |". Its rows
# run until the first line that does not start with "|".
awk -v table="$table" '
    function emit(  line) {
        while ((getline line < table) > 0) print line
        close(table)
        done = 1
    }
    in_table && /^\|/ { next }
    in_table { in_table = 0 }
    !done && /^\| # \| File \|/ { emit(); in_table = 1; next }
    !done && /^<!-- paste output of `render-items\.sh/ { skipping_comment = 1 }
    skipping_comment {
        if (/-->/) { skipping_comment = 0; emit() }
        next
    }
    !done && /^## Repository Verdict/ { emit(); print "" }
    { print }
    END { if (!done) exit 3 }
' "$summary" > "$written" || {
    echo "No items table, paste-here comment or \"## Repository Verdict\" heading in $summary" >&2
    exit 1
}

cat "$written" > "$summary"
echo "Wrote $(($(wc -l < "$table") - 2)) items to $summary"
