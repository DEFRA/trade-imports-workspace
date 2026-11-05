#!/bin/bash
# Put the test reviewers' acceptance-criteria evidence together as one table.
#
# Usage: ac-table.sh EUDPA-XXXXX [--json]
#
# Each test reviewer writes ac/<group id>.json in the review workarea:
#   [{"criterion": "AC1: ...", "evidence": [{"file": "f", "line": 4, "test": "t"}]}]
# Groups list the same criteria, each with the evidence it found. A criterion
# is matched across groups by its leading "ACn" label, or by its whole text
# when it has none, and keeps the wording of the first group that listed it.
#
# Prints a markdown table for review-index.md, one row per criterion in AC
# order: whether any test proves it, and the tests that do. --json prints the
# merged list instead. Exits 1 when the review has no ac/*.json files.

set -euo pipefail

usage() {
    cat >&2 <<EOF
Usage: $0 EUDPA-XXXXX [--json]

Merges ac/*.json from the review workarea into one acceptance-criteria table.
EOF
    exit 1
}

TICKET=""
JSON_OUTPUT=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        --json) JSON_OUTPUT=true; shift ;;
        -h|--help) usage ;;
        -*) echo "Unknown option: $1" >&2; usage ;;
        *) TICKET="$1"; shift ;;
    esac
done
[[ -n "$TICKET" ]] || usage

AC_DIR="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$TICKET/ac"
shopt -s nullglob
files=("$AC_DIR"/*.json)
if [[ ${#files[@]} -eq 0 ]]; then
    echo "No acceptance-criteria files in $AC_DIR: no test reviewer ran." >&2
    exit 1
fi

merged=$(jq -s '
    def key: (.criterion | capture("^(?<k>AC[0-9]+)\\b").k) // .criterion;
    def order: (.criterion | capture("^AC(?<n>[0-9]+)\\b").n | tonumber) // 1e9;
    [.[][] | . + {key: key, order: order}]
    | group_by(.key)
    | map({criterion: .[0].criterion, order: .[0].order,
           evidence: ([.[].evidence[]] | unique_by([.file, .line]))})
    | sort_by(.order, .criterion)
    | map(del(.order))
' "${files[@]}")

if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "$merged"
    exit 0
fi

echo "| # | Criterion | Proved by a test? | Evidence |"
echo "|---|-----------|-------------------|----------|"
echo "$merged" | jq -r '
    def cell: gsub("\\|"; "\\|") | gsub("\n"; " ");
    to_entries[]
    | "| \(.key + 1) | \(.value.criterion | cell) | "
      + (if (.value.evidence | length) > 0 then "Yes" else "No" end)
      + " | "
      + ([.value.evidence[] | "`\(.file):\(.line)` \(.test // "" | cell)"] | join("<br>"))
      + " |"
'
