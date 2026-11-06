#!/bin/bash
# Print an earlier review's PRs in the shape prepare-review.sh searches for,
# each pinned to the commit that review recorded.
#
# Usage: replay-prs.sh REVIEW_ID
#
# Reads workareas/reviews/REVIEW_ID/.review-meta.json and prints a JSON list:
#   [{"number": 21, "repository": {"name": "r"}, "state": "open",
#     "url": "", "createdAt": "", "commit": "<sha>"}]
# prepare-review.sh --same-as uses it to review the same PRs at the same
# commits, so two runs of the review can be compared. Exits 1 when the
# review or its meta file is missing, or it lists no PRs.

set -euo pipefail

SOURCE="${1:-}"
if [[ -z "$SOURCE" || "$SOURCE" == "-h" || "$SOURCE" == "--help" ]]; then
    echo "Usage: $0 REVIEW_ID" >&2
    echo "Prints REVIEW_ID's PRs, pinned to the commits it recorded." >&2
    exit 1
fi

META="$HOME/git/defra/trade-imports-workspace/workareas/reviews/$SOURCE/.review-meta.json"
[[ -f "$META" ]] || { echo "No review meta at $META" >&2; exit 1; }

jq -e '
    [.prs[] | {number: .pr, repository: {name: .repo}, state: .state,
               url: "", createdAt: "", commit: .commit}]
    | if length == 0 then error("lists no PRs") else . end
' "$META" 2> /dev/null || { echo "$META lists no PRs" >&2; exit 1; }
